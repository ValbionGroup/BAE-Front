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
import { Btn, Badge, Field, Input, ToastService, messageOf } from '@bae/ui';
import { ModalService } from '#shared/components/modal/modal.service';
import { GoodCreateModal } from '#shared/components/modal/good-create-modal/good-create-modal';
import type { StockProduct } from '../stocks.types';

/** `goodId` à `null` : code non rattaché, la ligne propose la création et ne
 *  part pas en stock. */
export interface ScanLine {
  readonly barcode: string;
  readonly goodId: number | null;
  readonly name: string;
  readonly quantity: number;
  /** `YYYY-MM-DD`, ou `''` tant que la DLC n'est pas saisie. */
  readonly expirationDate: string;
}

import { PageAction, PageActions } from '#shared/components/page-actions/page-actions';

@Component({
  selector: 'bfd-stocks-scanner',
  imports: [Btn, Badge, Field, Input, LucideDynamicIcon, PageActions],
  templateUrl: './scanner.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block h-full' },
})
export class StocksScanner {
  protected readonly pageActions = computed<readonly PageAction[]>(() => [
    { label: 'Quitter', icon: this.icX, kind: 'ghost', primary: true, run: () => this.quit() },
  ]);

  private readonly pageHeader = inject(PageHeaderService);
  private readonly modals = inject(ModalService);
  private readonly router = inject(Router);
  private readonly svc = inject(StocksService);
  private readonly store = inject(StocksStore);
  private readonly camera = inject(BarcodeScannerService);
  private readonly toast = inject(ToastService);

  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');
  private readonly video = viewChild<ElementRef<HTMLVideoElement>>('video');

  constructor() {
    this.pageHeader.set({
      title: 'Stocks',
      subtitle: 'Scanner · ajout rapide en lot',
      breadcrumb: ['Préparation', 'Stocks', 'Scanner'],
      activeNavId: 'stocks',
    });
    // `set()` efface les actions : les repousser après, dans le même effect.
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });

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
  protected readonly cameraBlockedBy = this.camera.unavailability();

  protected readonly lines = signal<readonly ScanLine[]>([]);
  protected readonly manualCode = signal('');
  protected readonly lookupError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly saveError = signal<string | null>(null);

  /** Lignes entrables en stock : produit connu et quantité utile. */
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

  /** Un code déjà dans la session incrémente sa ligne au lieu d'en ajouter une
   *  seconde. Le délai de relecture vit dans `BarcodeScannerService`. */
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

  protected createUnknown(barcode: string): void {
    this.modals.open({
      type: 'component',
      component: GoodCreateModal,
      inputs: {
        barcode,
        created: (product: StockProduct) => this.attach(barcode, product),
      },
    });
  }

  /**
   * Rattache le produit tout juste créé à la ligne qui l'a demandé.
   *
   * Sans cela la ligne resterait « à créer » : elle ne connaît que le code, et
   * `POST /goods` ne dit à personne qu'il vient de le rattacher.
   */
  private attach(barcode: string, product: StockProduct): void {
    this.lines.update((lines) =>
      lines.map((line) =>
        line.barcode === barcode ? { ...line, goodId: product.id, name: product.name } : line,
      ),
    );
  }

  /**
   * Séquentiel et non `forkJoin` : un lot refusé ne doit pas empêcher les
   * suivants, et la ligne aboutie quitte la session pour qu'une relance ne la
   * crée pas deux fois.
   */
  protected async validate(): Promise<void> {
    if (this.saving() || this.ready().length === 0) return;
    this.saving.set(true);
    this.saveError.set(null);

    let saved = 0;
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
        saved += 1;
      } catch (error) {
        failed = messageOf(error, "Certains lots n'ont pas pu être enregistrés.");
      }
    }

    this.saveError.set(failed);
    this.toast.show(
      failed
        ? { type: 'error', title: 'Enregistrement incomplet', message: failed }
        : {
            type: 'success',
            title: `${saved} lot${saved > 1 ? 's' : ''} enregistré${saved > 1 ? 's' : ''}`,
            message: 'Les quantités sont à jour dans les stocks.',
          },
    );
    this.saving.set(false);
    // Sans ce rafraîchissement, le tableau derrière garde les quantités d'avant.
    if (failed === null) await this.store.refresh();
  }

  protected quit(): void {
    void this.router.navigate(['/stocks']);
  }
}
