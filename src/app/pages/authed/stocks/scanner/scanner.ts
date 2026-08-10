import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  type ElementRef,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { lastValueFrom } from 'rxjs';
import {
  LucideCalendar,
  LucideCheck,
  LucideDynamicIcon,
  LucidePlus,
  LucideScanLine,
  LucideTrash2,
  LucideTriangleAlert,
  LucideX,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { StocksService } from '#core/services/stocks/stocks-service';
import { StocksStore } from '#core/store/stocks.store';
import { BarcodeScannerService } from '#core/services/barcode/barcode-scanner-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import { ModalService } from '#shared/components/modal/modal.service';
import { GoodCreateModal } from '#shared/components/modal/good-create-modal/good-create-modal';
import { messageOf } from '#shared/utils/api-error';

/**
 * Une ligne de la session de scan.
 *
 * `goodId` à `null` veut dire « ce code n'est rattaché à aucun produit » : la
 * ligne reste visible — c'est elle qui propose la création — mais elle ne part
 * pas en stock à la validation.
 */
export interface ScanLine {
  readonly barcode: string;
  readonly goodId: number | null;
  readonly name: string;
  readonly quantity: number;
  /** `YYYY-MM-DD`, ou `''` tant que la DLC n'est pas saisie. */
  readonly expirationDate: string;
}

@Component({
  selector: 'bfd-stocks-scanner',
  imports: [Btn, Badge, Field, Input, LucideDynamicIcon],
  templateUrl: './scanner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class StocksScanner {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly modals = inject(ModalService);
  private readonly router = inject(Router);
  private readonly svc = inject(StocksService);
  private readonly store = inject(StocksStore);
  private readonly camera = inject(BarcodeScannerService);

  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    this.pageHeader.set({
      title: 'Stocks',
      subtitle: 'Scanner · ajout rapide en lot',
      breadcrumb: ['Préparation', 'Stocks', 'Scanner'],
      activeNavId: 'stocks',
    });
    // Même piège que sur la page Stocks : `set()` efface les actions, donc le
    // gabarit se repousse après, dans le même effect.
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });

    // Les catégories servent à la modale de création d'un produit inconnu.
    void this.store.load();

    effect(() => {
      const el = this.video()?.nativeElement;
      if (!el || this.cameraStarted()) return;
      this.cameraStarted.set(true);
      void this.camera
        .start(el, (code) => void this.onBarcode(code))
        .then((ok) => {
          this.cameraLive.set(ok);
        });
    });

    inject(DestroyRef).onDestroy(() => this.camera.stop());
  }

  protected readonly icScan = LucideScanLine;
  protected readonly icX = LucideX;
  protected readonly icCheck = LucideCheck;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icCalendar = LucideCalendar;
  protected readonly icPlus = LucidePlus;
  protected readonly icTrash = LucideTrash2;

  private readonly cameraStarted = signal(false);
  protected readonly cameraLive = signal(false);
  protected readonly cameraSupported = this.camera.isSupported();

  protected readonly lines = signal<readonly ScanLine[]>([]);
  protected readonly manualCode = signal('');
  protected readonly lookupError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  /** Lignes réellement entrables en stock : produit connu et quantité utile. */
  protected readonly ready = computed(() =>
    this.lines().filter((line) => line.goodId !== null && line.quantity > 0),
  );

  protected readonly unknownCount = computed(
    () => this.lines().filter((line) => line.goodId === null).length,
  );

  protected onManualCode(value: string): void {
    this.manualCode.set(value);
  }

  protected submitManual(): void {
    const code = this.manualCode().trim();
    if (code === '') return;
    this.manualCode.set('');
    void this.onBarcode(code);
  }

  /**
   * Traite un code lu, au scanner ou à la main.
   *
   * Un code déjà dans la session **incrémente** sa ligne au lieu d'en ajouter
   * une seconde : la caméra lit la même étiquette plusieurs fois par seconde, et
   * sans cela un seul paquet remplirait l'écran.
   */
  protected async onBarcode(rawCode: string): Promise<void> {
    const barcode = rawCode.replace(/\s/g, '');
    if (barcode === '') return;

    const existing = this.lines().find((line) => line.barcode === barcode);
    if (existing) {
      this.bump(barcode, 1);
      return;
    }

    this.lookupError.set(null);
    try {
      const found = await lastValueFrom(this.svc.findByBarcode(barcode));
      const good = found[0] ?? null;
      this.lines.update((lines) => [
        {
          barcode,
          goodId: good?.id ?? null,
          name: good?.name ?? 'Produit inconnu',
          quantity: 1,
          expirationDate: '',
        },
        ...lines,
      ]);
    } catch (error) {
      this.lookupError.set(messageOf(error, 'Impossible de rechercher ce code-barres.'));
    }
  }

  protected bump(barcode: string, delta: number): void {
    this.lines.update((lines) =>
      lines.map((line) =>
        line.barcode === barcode ? { ...line, quantity: Math.max(1, line.quantity + delta) } : line,
      ),
    );
  }

  protected setExpiration(barcode: string, value: string): void {
    this.lines.update((lines) =>
      lines.map((line) => (line.barcode === barcode ? { ...line, expirationDate: value } : line)),
    );
  }

  protected remove(barcode: string): void {
    this.lines.update((lines) => lines.filter((line) => line.barcode !== barcode));
  }

  protected clearAll(): void {
    this.lines.set([]);
    this.saveError.set(null);
  }

  /** Ouvre la création de produit avec le code déjà rempli. */
  protected createUnknown(barcode: string): void {
    this.modals.open({
      type: 'component',
      component: GoodCreateModal,
      inputs: { barcode },
    });
  }

  /**
   * Entre en stock toutes les lignes exploitables.
   *
   * Séquentiel et non `forkJoin` : un lot refusé ne doit pas empêcher les
   * suivants, et la ligne qui a réussi disparaît de la session pour que
   * relancer la validation ne la crée pas deux fois.
   */
  protected async validate(): Promise<void> {
    if (this.saving() || this.ready().length === 0) return;
    this.saving.set(true);
    this.saveError.set(null);

    let failed: string | null = null;
    for (const line of this.ready()) {
      try {
        await lastValueFrom(
          this.svc.createBatch({
            goodId: line.goodId as number,
            quantity: line.quantity,
            expirationDate: line.expirationDate === '' ? null : line.expirationDate,
          }),
        );
        this.remove(line.barcode);
      } catch (error) {
        failed = messageOf(error, "Certains lots n'ont pas pu être enregistrés.");
      }
    }

    this.saveError.set(failed);
    this.saving.set(false);
    // Le tableau des stocks est derrière : sans ce rafraîchissement il
    // afficherait encore les quantités d'avant la session.
    if (failed === null) await this.store.refresh();
  }

  protected quit(): void {
    void this.router.navigate(['/stocks']);
  }
}
