import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  LucideDownload,
  LucideHandCoins,
  LucidePlus,
  LucideQrCode,
  LucideTrash2,
} from '@lucide/angular';
import { Btn, Input, QrCode, ToastService, downloadQrPng, formatCents, parseEuros } from '@bae/ui';
import { EventsStore } from '#core/store/events.store';
import type { MenuItem } from '#core/models/event.model';
import {
  SponsorshipsService,
  SPONSORSHIP_MODE_LABELS,
  type PriceEntry,
  type SponsorshipCategory,
  type SponsorshipMode,
} from '#core/services/sponsorships/sponsorships-service';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

interface GridRow {
  readonly productId: number;
  readonly name: string;
  /** Centimes. Prix public de la soirée. */
  readonly listPrice: number;
  /** `null` = pas de prix de catégorie, l'article part au prix public. */
  price: number | null;
  draft: string | null;
}

function slug(label: string): string {
  return (
    label
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'qr'
  );
}

/** `''` lève le plafond ; `undefined` = saisie illisible, qui ne vaut pas un ordre. */
function parseLimit(value: string): number | null | undefined {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  const parsed = Number(trimmed);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function messageOf(error: unknown, fallback: string): string {
  const body = (error as { error?: { message?: string } })?.error;
  return body?.message ?? fallback;
}

@Component({
  selector: 'bfd-sponsorship-categories-modal',
  imports: [Btn, Input, ModalShell, QrCode],
  templateUrl: './sponsorship-categories-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SponsorshipCategoriesModal {
  readonly id = input.required<string>();
  readonly eventId = input.required<string>();
  readonly eventLabel = input<string>('SOIRÉE');

  private readonly modalService = inject(ModalService);
  private readonly service = inject(SponsorshipsService);
  private readonly events = inject(EventsStore);
  private readonly toast = inject(ToastService);

  protected readonly icHand = LucideHandCoins;
  protected readonly icPlus = LucidePlus;
  protected readonly icQr = LucideQrCode;
  protected readonly icDownload = LucideDownload;
  protected readonly icTrash = LucideTrash2;

  protected readonly categories = signal<readonly SponsorshipCategory[]>([]);
  protected readonly selectedId = signal<number | null>(null);
  protected readonly rows = signal<readonly GridRow[]>([]);
  protected readonly newLabel = signal('');
  /** Externe par défaut : refacturer reste le cas courant. */
  protected readonly newMode = signal<SponsorshipMode>('external');
  protected readonly newMaxOrders = signal('');
  protected readonly modeLabels = SPONSORSHIP_MODE_LABELS;
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly qrToken = signal<string | null>(null);

  /** La grille à l'ouverture de la catégorie, pour n'écrire que les différences. */
  private initialPrices = new Map<number, number | null>();
  private requested = false;

  constructor() {
    effect(() => {
      const eventId = this.eventId();
      const event = this.events.getEventById(eventId);
      if (event?.menuStatus === 'init') void this.events.loadEventMenu(eventId);

      // `eventId` est une entrée requise : la lire dans le constructeur lèverait.
      if (!this.requested) {
        this.requested = true;
        void this.reload();
      }
    });
  }

  protected readonly selected = computed(() =>
    this.categories().find((category) => category.id === this.selectedId()),
  );

  private menu(): readonly MenuItem[] {
    return this.events.getEventById(this.eventId())?.menu ?? [];
  }

  private async reload(): Promise<void> {
    try {
      const categories = await lastValueFrom(this.service.list(this.eventId()));
      this.categories.set(categories);
      if (this.selectedId() === null && categories.length > 0) this.select(categories[0].id);
    } catch (error) {
      this.error.set(messageOf(error, 'Impossible de charger les catégories.'));
    }
  }

  protected select(categoryId: number): void {
    this.selectedId.set(categoryId);
    this.qrToken.set(null);

    const prices = new Map(
      (this.categories().find((c) => c.id === categoryId)?.prices ?? []).map((p) => [
        p.productId,
        p.priceCents,
      ]),
    );

    this.initialPrices = new Map(
      this.menu().map((line) => [line.productId, prices.get(line.productId) ?? null]),
    );
    this.rows.set(
      this.menu().map((line) => ({
        productId: line.productId,
        name: line.name,
        listPrice: line.price,
        price: prices.get(line.productId) ?? null,
        draft: null,
      })),
    );
  }

  protected priceText(row: GridRow): string {
    if (row.draft !== null) return row.draft;
    return row.price === null ? '' : this.fmt(row.price);
  }

  protected onPriceInput(productId: number, value: string): void {
    this.update(productId, (row) => ({ ...row, draft: value }));
  }

  /** Champ vidé = retour au prix public ; `0` saisi = gratuit pour la personne. */
  protected commitPrice(productId: number, value: string): void {
    const trimmed = value.trim();
    if (trimmed === '') {
      this.update(productId, (row) => ({ ...row, price: null, draft: null }));
      return;
    }

    const cents = parseEuros(trimmed);
    if (cents === null) {
      this.update(productId, (row) => ({ ...row, draft: null }));
      return;
    }

    this.update(productId, (row) => ({ ...row, price: cents, draft: null }));
  }

  protected fillAll(fraction: number): void {
    this.rows.update((rows) =>
      rows.map((row) => ({ ...row, price: Math.round(row.listPrice * fraction), draft: null })),
    );
  }

  private update(productId: number, change: (row: GridRow) => GridRow): void {
    this.rows.update((rows) =>
      rows.map((row) => (row.productId === productId ? change(row) : row)),
    );
  }

  protected async addCategory(): Promise<void> {
    const label = this.newLabel().trim();
    if (label === '' || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const created = await lastValueFrom(
        this.service.create(
          this.eventId(),
          label,
          this.newMode(),
          parseLimit(this.newMaxOrders()) ?? null,
        ),
      );
      this.categories.update((all) => [...all, created]);
      this.newLabel.set('');
      this.newMaxOrders.set('');
      this.newMode.set('external');
      this.select(created.id);
    } catch (error) {
      this.error.set(messageOf(error, 'Impossible de créer cette catégorie.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected onNewMode(value: string): void {
    this.newMode.set(value as SponsorshipMode);
  }

  /** Écrit à la volée, comme le mode : la grille et son plafond s'enregistrent
   *  séparément. */
  protected async commitMaxOrders(value: string): Promise<void> {
    const category = this.selected();
    const maxOrders = parseLimit(value);
    if (!category || this.busy() || maxOrders === undefined || maxOrders === category.maxOrders) {
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    try {
      const updated = await lastValueFrom(
        this.service.update(this.eventId(), category.id, { maxOrders }),
      );
      this.categories.update((all) => all.map((c) => (c.id === updated.id ? updated : c)));
    } catch (error) {
      this.error.set(messageOf(error, 'Impossible de changer la limite de cette catégorie.'));
    } finally {
      this.busy.set(false);
    }
  }

  /** `null` quand le QR n'a pas de plafond : il n'y a rien à décompter. */
  protected usageLabel(category: SponsorshipCategory): string | null {
    if (category.maxOrders === null) return null;
    return `${category.usedOrders} / ${category.maxOrders} commandes utilisées`;
  }

  protected exhausted(category: SponsorshipCategory): boolean {
    return category.maxOrders !== null && category.usedOrders >= category.maxOrders;
  }

  /**
   * Le serveur refuse la bascule dès la première vente (`409 E_CATEGORY_IN_USE`)
   * : on laisse le geste disponible et on affiche son refus, plutôt que de
   * désactiver le bouton sur une supposition — l'écran ne sait pas si des
   * commandes existent.
   */
  protected async switchMode(mode: SponsorshipMode): Promise<void> {
    const category = this.selected();
    if (!category || this.busy() || category.mode === mode) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const updated = await lastValueFrom(
        this.service.update(this.eventId(), category.id, { mode }),
      );
      this.categories.update((all) => all.map((c) => (c.id === updated.id ? updated : c)));
    } catch (error) {
      this.error.set(messageOf(error, 'Impossible de changer le mode de cette catégorie.'));
    } finally {
      this.busy.set(false);
    }
  }

  protected async showQr(): Promise<void> {
    const category = this.selected();
    if (!category) return;
    try {
      const { token } = await lastValueFrom(this.service.qr(this.eventId(), category.id));
      this.qrToken.set(token);
    } catch (error) {
      this.error.set(messageOf(error, "Impossible d'émettre le QR."));
    }
  }

  protected async downloadQr(): Promise<void> {
    const token = this.qrToken();
    const category = this.selected();
    if (!token || !category) return;
    try {
      await downloadQrPng(token, `qr-${slug(this.eventLabel())}-${slug(category.label)}.png`);
    } catch (error) {
      this.error.set(messageOf(error, "Impossible de générer l'image du QR."));
    }
  }

  protected async rotateQr(): Promise<void> {
    const category = this.selected();
    if (!category) return;
    await lastValueFrom(this.service.rotateQr(this.eventId(), category.id));
    this.qrToken.set(null);
    this.toast.show({
      type: 'success',
      title: 'QR régénéré',
      message: 'Les exemplaires déjà imprimés ne fonctionnent plus.',
    });
  }

  protected async removeCategory(): Promise<void> {
    const category = this.selected();
    if (!category || this.busy()) return;

    this.busy.set(true);
    try {
      await lastValueFrom(this.service.remove(this.eventId(), category.id));
      this.categories.update((all) => all.filter((c) => c.id !== category.id));
      this.selectedId.set(null);
      this.rows.set([]);
    } catch (error) {
      this.toast.show({
        type: 'error',
        title: 'Suppression refusée',
        message: messageOf(error, 'Impossible de supprimer cette catégorie.'),
      });
    } finally {
      this.busy.set(false);
    }
  }

  protected async save(): Promise<void> {
    const category = this.selected();
    if (!category || this.busy()) return;

    const changed: PriceEntry[] = this.rows()
      .filter((row) => this.initialPrices.get(row.productId) !== row.price)
      .map((row) => ({ productId: row.productId, priceCents: row.price }));

    if (changed.length === 0) {
      this.close();
      return;
    }

    this.busy.set(true);
    try {
      const saved = await lastValueFrom(
        this.service.setPrices(this.eventId(), category.id, changed),
      );
      this.categories.update((all) => all.map((c) => (c.id === saved.id ? saved : c)));
      this.toast.show({ type: 'success', title: 'Grille enregistrée', message: category.label });
      this.close();
    } catch (error) {
      this.toast.show({
        type: 'error',
        title: 'Enregistrement refusé',
        message: messageOf(error, 'Impossible d’enregistrer cette grille.'),
      });
    } finally {
      this.busy.set(false);
    }
  }

  protected close(): void {
    this.modalService.close(this.id());
  }

  /** Reçoit des **centimes** : `price` et `listPrice` en sont tous deux. */
  protected fmt(cents: number): string {
    return formatCents(cents);
  }
}
