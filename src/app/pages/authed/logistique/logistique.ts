import {
  ChangeDetectionStrategy,
  Component,
  type ElementRef,
  OnInit,
  type TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideDynamicIcon,
  LucideLock,
  LucidePlus,
  LucideTicket,
  LucideUpload,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { LogistiqueStore } from '#core/store/logistique.store';
import { Badge } from '#shared/components/ui/badge/badge';
import { Checkbox } from '#shared/components/ui/checkbox/checkbox';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { Btn } from '#shared/components/ui/btn/btn';
import { ModalService } from '#shared/components/modal/modal.service';
import { VoucherCreateModal } from '#shared/components/modal/voucher-create-modal/voucher-create-modal';
import type {
  ApiGood,
  CartCell,
  CartRow,
  SupplierColumn,
  SupplierTotal,
  VoucherCard,
} from './logistique.types';

/** Builds the dynamic retailer column set from the suppliers present in the data. */
function buildColumns(goods: readonly ApiGood[]): SupplierColumn[] {
  const coverage = new Map<number, { name: string; coverage: number }>();
  for (const good of goods) {
    for (const supplier of good.suppliers) {
      const entry = coverage.get(supplier.id);
      if (entry) {
        entry.coverage += 1;
      } else {
        coverage.set(supplier.id, { name: supplier.name, coverage: 1 });
      }
    }
  }

  return (
    [...coverage.entries()]
      .map(([id, { name, coverage: c }]) => ({ id, name, coverage: c }))
      // Widest coverage first so the most comparable retailers stay in view when
      // the table has to scroll horizontally; name breaks ties for stable order.
      .sort((a, b) => b.coverage - a.coverage || a.name.localeCompare(b.name, 'fr'))
  );
}

function buildRow(good: ApiGood, columns: readonly SupplierColumn[]): CartRow {
  const byId = new Map(good.suppliers.map((s) => [s.id, s.price]));
  const cells: CartCell[] = columns.map((column) => ({
    supplierId: column.id,
    price: byId.get(column.id) ?? null,
    isBest: good.bestSupplier !== null && good.bestSupplier.id === column.id,
  }));

  return {
    id: good.id,
    name: good.name,
    unit: good.unit,
    brand: good.brand,
    categoryName: good.category?.name ?? '—',
    cells,
    bestSupplierName: good.bestSupplier?.name ?? null,
    bestPrice: good.bestPrice,
  };
}

@Component({
  selector: 'bfd-logistique',
  imports: [Badge, Btn, Checkbox, Skeleton, LucideDynamicIcon],
  templateUrl: './logistique.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logistique implements OnInit {
  private readonly store = inject(LogistiqueStore);
  private readonly modalService = inject(ModalService);
  private readonly pageHeader = inject(PageHeaderService);

  /** Actions poussées dans la topbar, comme sur la page Équipe. */
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');
  private readonly vouchersPanel = viewChild<ElementRef<HTMLElement>>('vouchersPanel');

  constructor() {
    this.pageHeader.set({
      title: 'Logistique',
      subtitle: 'Liste de courses · comparatif enseignes',
      breadcrumb: ['Préparation', 'Logistique', 'Courses'],
      activeNavId: 'log',
    });
    // `set()` efface le gabarit d'actions : il faut donc le repousser après,
    // et depuis un `effect` — dans le constructeur, la vue n'existe pas encore
    // et `actionsTpl()` vaut `undefined`.
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected readonly icTicket = LucideTicket;
  protected readonly icUpload = LucideUpload;
  protected readonly icPlus = LucidePlus;
  protected readonly icLock = LucideLock;

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;
  protected readonly vouchers = this.store.vouchers;
  protected readonly savingVoucherIds = this.store.savingVoucherIds;
  protected readonly voucherError = this.store.voucherError;
  protected readonly voucherErrorId = this.store.voucherErrorId;
  protected readonly vouchersForbidden = this.store.vouchersForbidden;
  protected readonly vouchersLoadError = this.store.vouchersLoadError;

  /**
   * Rows the user has unticked. Tracking exclusions (rather than inclusions)
   * means a freshly loaded list starts fully selected without seeding state.
   */
  private readonly excludedIds = signal<ReadonlySet<number>>(new Set());

  /** One column per supplier actually present in the loaded goods. */
  protected readonly columns = computed(() => buildColumns(this.store.goods()));

  protected readonly rows = computed(() => {
    const columns = this.columns();
    return this.store.goods().map((good) => buildRow(good, columns));
  });

  protected readonly selectedRows = computed(() => {
    const excluded = this.excludedIds();
    return this.rows().filter((row) => !excluded.has(row.id));
  });

  protected readonly hasSuppliers = computed(() => this.columns().length > 0);

  /** Column totals over the selected rows only. */
  protected readonly supplierTotals = computed<SupplierTotal[]>(() => {
    const selected = this.selectedRows();
    return this.columns().map((column, index) => {
      let total = 0;
      let priced = 0;
      for (const row of selected) {
        const price = row.cells[index]?.price ?? null;
        if (price !== null) {
          total += price;
          priced += 1;
        }
      }
      return {
        supplierId: column.id,
        total: priced > 0 ? total : null,
        fullCoverage: selected.length > 0 && priced === selected.length,
      };
    });
  });

  /** Sum of the cheapest available price for every selected row. */
  protected readonly optimumTotal = computed(() =>
    this.selectedRows().reduce((sum, row) => sum + (row.bestPrice ?? 0), 0),
  );

  /**
   * What buying everything at a single retailer would cost, taking the cheapest
   * retailer that stocks *every* selected row. `null` when none does — the
   * comparison would otherwise be between different baskets.
   */
  private readonly bestSingleRetailerTotal = computed(() => {
    const totals = this.supplierTotals().filter((t) => t.fullCoverage && t.total !== null);
    if (totals.length === 0) return null;
    return Math.min(...totals.map((t) => t.total as number));
  });

  /** Amount saved by splitting the basket across retailers; `null` if not comparable. */
  protected readonly multiRetailerSaving = computed(() => {
    const single = this.bestSingleRetailerTotal();
    return single === null ? null : single - this.optimumTotal();
  });

  /** Vouchers that could still be spent: neither used nor expired. */
  protected readonly usableVoucherTotal = computed(() =>
    this.vouchers().reduce((sum, v) => (!v.used && !v.expired ? sum + v.value : sum), 0),
  );

  /**
   * Le KPI dit « — » et non « 0 € » quand les bons sont hors de portée :
   * `usableVoucherTotal` somme une liste vide et affirmerait donc qu'aucun bon
   * n'est utilisable, là où la vérité est qu'on n'a pas le droit de le savoir.
   */
  protected readonly usableVoucherLabel = computed(() =>
    this.vouchersForbidden() || this.vouchersLoadError() !== null
      ? '—'
      : `${this.formatPrice(this.usableVoucherTotal())} €`,
  );

  protected readonly savingLabel = computed(() => {
    const saving = this.multiRetailerSaving();
    if (saving === null) return '—';
    if (saving <= 0) return `${this.formatPrice(0)} €`;
    return `−${this.formatPrice(saving)} €`;
  });

  protected isSelected(id: number): boolean {
    return !this.excludedIds().has(id);
  }

  protected toggleRow(id: number, selected: boolean): void {
    this.excludedIds.update((current) => {
      const next = new Set(current);
      if (selected) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected readonly allSelected = computed(
    () => this.rows().length > 0 && this.selectedRows().length === this.rows().length,
  );

  protected toggleAll(selected: boolean): void {
    this.excludedIds.set(selected ? new Set() : new Set(this.rows().map((row) => row.id)));
  }

  protected retry(): void {
    void this.store.refresh();
  }

  protected formatPrice(value: number): string {
    return value.toFixed(2).replace('.', ',');
  }

  protected cellClass(cell: CartCell): string {
    if (cell.price === null) return 'text-muted/60';
    return cell.isBest ? 'text-ok font-semibold' : 'text-muted';
  }

  protected totalClass(total: SupplierTotal): string {
    return total.fullCoverage ? 'text-text-2' : 'text-muted/60';
  }

  /** Screen-reader wording for a column total that only covers part of the basket. */
  protected totalHint(total: SupplierTotal): string | null {
    if (total.total === null) return 'Cette enseigne ne référence aucun article sélectionné';
    return total.fullCoverage
      ? null
      : 'Total partiel : cette enseigne ne référence pas tous les articles sélectionnés';
  }

  protected openCreateVoucher(): void {
    this.modalService.open({ type: 'component', component: VoucherCreateModal, inputs: {} });
  }

  /**
   * Le bouton « Bons d'achat (n) » de la topbar amène au panneau.
   *
   * Le compteur est la seule chose que la maquette lui donne à faire ; sur une
   * page qui affiche déjà le panneau plus bas, le mener jusqu'à lui est ce qui
   * reste d'utile — et évite un bouton décoratif.
   */
  protected scrollToVouchers(): void {
    this.vouchersPanel()?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  protected isSaving(id: number): boolean {
    return this.savingVoucherIds().includes(id);
  }

  protected toggleVoucher(voucher: VoucherCard): void {
    void this.store.toggleVoucherUsed(voucher.id, !voucher.used);
  }

  /**
   * Nom accessible complet du bouton de bascule. Un libellé « Consommé »
   * répété sur chaque carte est inexploitable au lecteur d'écran, qui annonce
   * le bouton hors de son contexte visuel.
   */
  protected toggleLabel(voucher: VoucherCard): string {
    const identity = `le bon ${voucher.supplierName} de ${this.formatPrice(voucher.value)} €`;
    return voucher.used
      ? `Annuler la consommation ${identity}`
      : `Marquer ${identity} comme consommé`;
  }

  protected voucherToneClass(warn: boolean, expired: boolean, used: boolean): string {
    if (used || expired) return 'border-border opacity-60';
    return warn ? 'border-warn' : 'border-border';
  }
}
