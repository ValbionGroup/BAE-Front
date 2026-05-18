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
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Checkbox } from '#shared/components/ui/checkbox/checkbox';
import { Toggle } from '#shared/components/ui/toggle/toggle';
import { Input } from '#shared/components/ui/input/input';
import type { DlcStatus, SortDir, SortKey, StockBatchRow, StockProduct } from './stocks.types';

@Component({
  selector: 'bfd-stocks',
  imports: [Btn, Badge, Card, Checkbox, Toggle, Input, LucideDynamicIcon],
  templateUrl: './stocks.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stocks implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly router = inject(Router);
  private readonly store = inject(StocksStore);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  constructor() {
    this.pageHeader.set({
      title: 'Stocks',
      subtitle: 'Chargement…',
      breadcrumb: ['Préparation', 'Stocks'],
      activeNavId: 'stocks',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
    effect(() => {
      const products = this.store.products();
      const batches = products.reduce((sum, p) => sum + p.batchCount, 0);
      this.pageHeader.set({
        title: 'Stocks',
        subtitle: `${products.length} produits · ${batches} lots`,
        breadcrumb: ['Préparation', 'Stocks'],
        activeNavId: 'stocks',
      });
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
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;

  protected readonly icScan = LucideScanLine;
  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icFilter = LucideFunnel;
  protected readonly icSort = LucideArrowDownUp;
  protected readonly icTrash = LucideTrash2;

  protected readonly searchQuery = signal('');
  protected readonly activeCategory = signal('Tous');
  protected readonly sortKey = signal<SortKey>('name');
  protected readonly sortDir = signal<SortDir>('asc');

  protected readonly selectedId = signal<number | null>(null);
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
