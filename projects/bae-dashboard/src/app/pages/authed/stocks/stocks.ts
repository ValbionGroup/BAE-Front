import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
  untracked,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  LucideArrowDownUp,
  LucideClock,
  LucideDownload,
  LucideDynamicIcon,
  LucideFunnel,
  LucidePackage,
  LucidePlus,
  LucideScanLine,
  LucideSearch,
  LucideTrash2,
  LucideTriangleAlert,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { StocksStore } from '#core/store/stocks.store';
import {
  Btn,
  Badge,
  Card,
  Checkbox,
  Toggle,
  Input,
  DetailSheet,
  ToastService,
  formatCents,
  messageOf,
} from '@bae/ui';
import { Store } from '@ngrx/store';
import { selectPermissions } from '#core/store/auth/auth.selector';
import type { ApiGoodPrices } from '#core/services/stocks/stocks-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { SupplierPriceModal } from '#shared/components/modal/supplier-price-modal/supplier-price-modal';
import { GoodCreateModal } from '#shared/components/modal/good-create-modal/good-create-modal';
import { PrintService } from '#core/services/print/print-service';
import { PageAction, PageActions } from '#shared/components/page-actions/page-actions';
import type { DlcStatus, SortDir, SortKey, StockBatchRow, StockProduct } from './stocks.types';

@Component({
  selector: 'bfd-stocks',
  imports: [Btn, Badge, Card, Checkbox, Toggle, Input, LucideDynamicIcon, PageActions, DetailSheet],
  templateUrl: './stocks.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sans hauteur sur l'hôte, le `h-full` du gabarit ne résout rien et c'est
  // l'app-shell qui défile, toute la page d'un bloc.
  host: { class: 'block h-full' },
})
export class Stocks implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly store = inject(StocksStore);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);
  private readonly permissions = inject(Store).selectSignal(selectPermissions);
  private readonly printService = inject(PrintService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Stocks',
      subtitle: 'Chargement…',
      breadcrumb: ['Préparation', 'Stocks'],
      activeNavId: 'stocks',
    });
    // ⚠️ Un seul effect, dans cet ordre : `set()` remet les actions à `null`,
    // donc un effect séparé effacerait les boutons au premier chargement.
    effect(() => {
      const products = this.store.products();
      const batches = products.reduce((sum, p) => sum + p.batchCount, 0);
      this.pageHeader.set({
        title: 'Stocks',
        subtitle: `${products.length} produits · ${batches} lots`,
        breadcrumb: ['Préparation', 'Stocks'],
        activeNavId: 'stocks',
      });
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
    effect(() => {
      const id = this.selectedId();
      const showEmpty = this.showEmptyBatches();
      if (id === null) return;
      this.batchesLoading.set(true);
      void this.store.getBatches(id, showEmpty).then((batches) => {
        this.selectedBatches.set(batches);
        this.batchesLoading.set(false);
      });
    });

    // Les tarifs suivent la denrée sélectionnée, et se rechargent après chaque
    // écriture — d'où `pricesVersion`, incrémenté par les gestes du panneau.
    effect(() => {
      const id = this.selectedId();
      this.pricesVersion();
      if (id === null) return;
      untracked(() => void this.loadPrices(id));
    });
  }

  private async loadPrices(goodId: number): Promise<void> {
    this.pricesLoading.set(true);
    this.prices.set(await this.store.getSupplierPrices(goodId));
    this.pricesLoading.set(false);
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;

  protected readonly pageActions = computed<readonly PageAction[]>(() => [
    { label: 'Scanner', icon: this.icScan, run: () => this.openScanner() },
    { label: 'Inventaire', icon: this.icDownload, run: () => this.printInventory() },
    {
      label: 'Produit',
      icon: this.icPlus,
      kind: 'primary',
      primary: true,
      testId: 'add-good',
      run: () => this.openCreateGood(),
    },
  ]);

  protected readonly icScan = LucideScanLine;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icFilter = LucideFunnel;
  protected readonly icSort = LucideArrowDownUp;
  protected readonly icTrash = LucideTrash2;
  protected readonly icPackage = LucidePackage;

  protected readonly searchQuery = signal('');
  protected readonly activeCategory = signal('Tous');
  protected readonly sortKey = signal<SortKey>('name');
  protected readonly sortDir = signal<SortDir>('asc');

  protected readonly selectedId = signal<number | null>(null);

  /** Tarifs de la denrée sélectionnée ; `null` tant qu'on n'a rien lu. */
  protected readonly prices = signal<ApiGoodPrices | null>(null);
  protected readonly pricesLoading = signal(false);
  /** Bumpé après chaque écriture pour forcer la relecture. */
  private readonly pricesVersion = signal(0);

  /** Frontière unique de conversion centimes → euros à l'affichage. */
  protected readonly formatCents = formatCents;

  protected readonly canPrice = computed<boolean>(() => this.permissions().includes('good:write'));

  /** « Prix par kg » — l'unité est dite en clair, parce que rien ne normalise
   *  les conditionnements : `pricing_service` compare les prix bruts. */
  protected readonly priceUnitLabel = computed(() => {
    const unit = this.prices()?.unit ?? this.selectedProduct()?.unit ?? '';
    return unit === '' ? 'Prix' : `Prix par ${unit}`;
  });

  protected openPriceEditor(supplierId: number | null): void {
    const good = this.prices();
    if (!good) return;
    this.modal.open({
      type: 'component',
      component: SupplierPriceModal,
      inputs: {
        goodId: good.id,
        goodName: good.name,
        unitLabel: this.priceUnitLabel(),
        supplierId,
        current:
          supplierId === null ? null : (good.suppliers.find((s) => s.id === supplierId) ?? null),
        taken: good.suppliers.map((s) => s.id),
        onDone: () => this.pricesVersion.update((v) => v + 1),
      },
    });
  }

  protected confirmRemovePrice(supplierId: number, supplierName: string): void {
    const good = this.prices();
    if (!good) return;
    this.modal.open({
      type: 'delete',
      title: 'Retirer le tarif',
      message: `« ${supplierName} » ne proposera plus de prix pour ${good.name}.`,
      details:
        'Si c’était le prix de référence, le coût de recette et la liste de courses passeront au suivant le moins cher.',
      onConfirm: () => void this.removePrice(good.id, supplierId, supplierName),
    });
  }

  private async removePrice(goodId: number, supplierId: number, name: string): Promise<void> {
    const result = await this.store.removeSupplierPrice(goodId, supplierId);
    if (!result.ok) {
      this.toast.show({
        type: 'error',
        title: 'Retrait refusé',
        message: messageOf(result.error, 'Le tarif n’a pas pu être retiré.'),
      });
      return;
    }
    this.pricesVersion.update((v) => v + 1);
    this.toast.show({ type: 'success', title: 'Tarif retiré', message: `« ${name} ».` });
  }
  protected readonly selectedBatches = signal<readonly StockBatchRow[]>([]);
  protected readonly batchesLoading = signal(false);
  protected readonly showEmptyBatches = signal(false);

  protected readonly selectedIds = signal<ReadonlySet<number>>(new Set<number>());

  protected readonly allSelected = computed(() => {
    const visible = this.visibleProducts();
    const ids = this.selectedIds();
    return visible.length > 0 && visible.every((p) => ids.has(p.id));
  });

  protected readonly someSelected = computed(() => {
    const visible = this.visibleProducts();
    const ids = this.selectedIds();
    return visible.some((p) => ids.has(p.id));
  });

  protected readonly categoryTabs = computed(() => {
    const cats = new Set(this.store.products().map((p) => p.categoryName));
    return ['Tous', ...Array.from(cats).sort()];
  });

  protected readonly visibleProducts = computed<readonly StockProduct[]>(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.activeCategory();
    const key = this.sortKey();
    const dir = this.sortDir();

    let list = this.store.products();

    if (cat !== 'Tous') {
      list = list.filter((p) => p.categoryName === cat);
    }
    if (q) {
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    return [...list].sort((a, b) => {
      let cmp = 0;
      if (key === 'name') cmp = a.name.localeCompare(b.name, 'fr');
      else if (key === 'qty') cmp = a.totalQty - b.totalQty;
      else if (key === 'category') cmp = a.categoryName.localeCompare(b.categoryName, 'fr');
      else if (key === 'dlc') {
        const da = a.nearestDlc ?? '￿';
        const db = b.nearestDlc ?? '￿';
        cmp = da.localeCompare(db);
      }
      return dir === 'asc' ? cmp : -cmp;
    });
  });

  protected readonly selectedProduct = computed(
    () => this.store.products().find((p) => p.id === this.selectedId()) ?? null,
  );

  /**
   * Le lot à prendre en premier : le plus proche de la DLC parmi les lots **non
   * périmés** et non vides. `selectedBatches()` arrive déjà trié par DLC
   * croissante depuis l'API — le premier qui passe le filtre est le bon.
   *
   * Un lot périmé n'est jamais celui qu'on propose de prendre : le FEFO sert à
   * ne pas gâcher, pas à faire manger du périmé. Il garde son propre badge et
   * son bouton de mise au rebut.
   */
  protected readonly firstToTakeId = computed<number | null>(() => {
    const batch = this.selectedBatches().find(
      (b) => b.dlcStatus !== 'expired' && b.remainingQty > 0,
    );
    return batch?.id ?? null;
  });

  protected readonly kpis = computed(() => {
    const products = this.store.products();
    const expired = products.reduce((s, p) => s + p.expiredBatchCount, 0);
    const soon = products.reduce((s, p) => s + p.soonBatchCount, 0);
    const inStock = products.filter((p) => p.totalQty > 0).length;
    const totalBatches = products.reduce((s, p) => s + p.batchCount, 0);
    return [
      {
        label: 'Périmés',
        value: `${expired} lots`,
        colorClass: 'text-danger',
        icon: LucideTriangleAlert,
      },
      {
        label: 'Proche péremption',
        value: `${soon} lots`,
        colorClass: 'text-warn',
        icon: LucideClock,
      },
      {
        label: 'Produits en stock',
        value: String(inStock),
        colorClass: 'text-text',
        icon: LucidePackage,
      },
      {
        label: 'Total lots',
        value: String(totalBatches),
        colorClass: 'text-text',
        icon: LucidePackage,
      },
    ];
  });

  protected openScanner(): void {
    void this.router.navigate(['/stocks/scanner']);
  }

  protected openCreateGood(): void {
    this.modal.open({ type: 'component', component: GoodCreateModal, inputs: {} });
  }

  protected printInventory(): void {
    this.printService.download('/stock-batches/inventory/pdf', 'inventaire-stock.pdf');
  }

  protected printLabels(batchId: number): void {
    this.printService.download(`/stock-batches/labels/pdf?ids=${batchId}`, 'etiquettes-lot.pdf');
  }

  protected toggleSelect(id: number): void {
    this.selectedIds.update((set) => {
      const next = new Set(set);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  protected toggleAll(): void {
    const visible = this.visibleProducts();
    if (this.allSelected()) {
      this.selectedIds.update((set) => {
        const next = new Set(set);
        visible.forEach((p) => next.delete(p.id));
        return next;
      });
    } else {
      this.selectedIds.update((set) => {
        const next = new Set(set);
        visible.forEach((p) => next.add(p.id));
        return next;
      });
    }
  }

  protected clearSelection(): void {
    this.selectedIds.set(new Set());
  }

  protected setSearch(q: string): void {
    this.searchQuery.set(q);
  }

  protected setCategory(cat: string): void {
    this.activeCategory.set(cat);
  }

  protected setSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDir.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.sortKey.set(key);
      this.sortDir.set('asc');
    }
  }

  protected async discard(batch: StockBatchRow): Promise<void> {
    const product = this.selectedProduct();
    if (!product) return;
    await this.store.discardBatch(product.id, batch.id, batch.remainingQty);
    // l'effect se déclenche sur selectedId + showEmptyBatches, mais on force un reload
    const batches = await this.store.getBatches(product.id, this.showEmptyBatches());
    this.selectedBatches.set(batches);
  }

  protected async select(id: number): Promise<void> {
    this.selectedBatches.set([]);
    this.selectedId.set(id); // déclenche l'effect
  }

  protected dlcDotColor(status: DlcStatus): string {
    if (status === 'expired') return 'bg-danger';
    if (status === 'soon') return 'bg-warn';
    if (status === 'ok') return 'bg-ok';
    return 'bg-border';
  }

  protected dlcTextColor(status: DlcStatus): string {
    return status === 'expired' ? 'text-danger' : 'text-text-2';
  }

  protected lotBorderClass(status: DlcStatus): string {
    if (status === 'expired') return 'border-danger';
    if (status === 'soon') return 'border-warn';
    return 'border-border-s';
  }

  protected lotBars(p: StockProduct): DlcStatus[] {
    const bars: DlcStatus[] = [];
    for (let i = 0; i < p.expiredBatchCount; i++) bars.push('expired');
    for (let i = 0; i < p.soonBatchCount; i++) bars.push('soon');
    const okCount = p.batchCount - p.expiredBatchCount - p.soonBatchCount;
    for (let i = 0; i < Math.max(0, okCount); i++) bars.push('ok');
    return bars;
  }

  protected lotBarColor(status: DlcStatus): string {
    if (status === 'expired') return 'bg-danger';
    if (status === 'soon') return 'bg-warn';
    return 'bg-blue-deep';
  }
}
