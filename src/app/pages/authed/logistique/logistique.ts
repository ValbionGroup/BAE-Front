import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  type TemplateRef,
  computed,
  effect,
  inject,
  viewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  LucideDownload,
  LucideDynamicIcon,
  LucideLock,
  LucidePencil,
  LucidePlus,
  LucideTicket,
  LucideTrash2,
  LucideUpload,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { LogistiqueStore } from '#core/store/logistique.store';
import { Badge } from '#shared/components/ui/badge/badge';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { Btn } from '#shared/components/ui/btn/btn';
import { ModalService } from '#shared/components/modal/modal.service';
import { ToastService } from '#shared/components/toast/toast.service';
import { VoucherCreateModal } from '#shared/components/modal/voucher-create-modal/voucher-create-modal';
import { VoucherEditModal } from '#shared/components/modal/voucher-edit-modal/voucher-edit-modal';
import type {
  ApiShoppingLine,
  ApiShoppingSupplierTotal,
  CartCell,
  SupplierColumn,
  VoucherCard,
} from './logistique.types';

/** Une ligne « denrée » prête pour le tableau à colonnes d'enseignes. */
interface GoodRow {
  readonly id: number;
  readonly name: string;
  readonly unit: string | null;
  readonly brand: string | null;
  readonly categoryName: string | null;
  readonly missingQty: number;
  readonly cells: readonly CartCell[];
  readonly bestSupplierName: string | null;
  readonly bestPrice: number | null;
}

/**
 * Colonnes d'enseignes dérivées des seules lignes « denrée » : le
 * non-alimentaire n'a aucune relation fournisseur (`furnitures` ne pointe vers
 * aucune enseigne) et ne peut donc pas peupler ce jeu de colonnes.
 */
function buildRetailerColumns(lines: readonly ApiShoppingLine[]): SupplierColumn[] {
  const coverage = new Map<number, { name: string; coverage: number }>();
  for (const line of lines) {
    for (const supplier of line.suppliers) {
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
      // Couverture la plus large en tête pour garder les enseignes les plus
      // comparables visibles quand le tableau doit défiler horizontalement ;
      // le nom départage les égalités pour un ordre stable.
      .sort((a, b) => b.coverage - a.coverage || a.name.localeCompare(b.name, 'fr'))
  );
}

function buildGoodRow(line: ApiShoppingLine, columns: readonly SupplierColumn[]): GoodRow {
  const byId = new Map(line.suppliers.map((s) => [s.id, s.price]));
  const cells: CartCell[] = columns.map((column) => ({
    supplierId: column.id,
    price: byId.get(column.id) ?? null,
    isBest: line.bestSupplier !== null && line.bestSupplier.id === column.id,
  }));

  return {
    id: line.id,
    name: line.name,
    unit: line.unit,
    brand: line.brand,
    categoryName: line.categoryName,
    missingQty: line.missingQty,
    cells,
    bestSupplierName: line.bestSupplier?.name ?? null,
    bestPrice: line.bestPrice,
  };
}

@Component({
  selector: 'bfd-logistique',
  imports: [Badge, Btn, Skeleton, LucideDynamicIcon],
  templateUrl: './logistique.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Voir le commentaire équivalent sur `LogistiqueEvents` : sans hauteur sur
  // l'hôte, aucun `h-full` du gabarit ne résout et le défilement remonte à
  // l'app-shell.
  host: { class: 'block h-full' },
})
export class Logistique implements OnInit {
  private readonly store = inject(LogistiqueStore);
  private readonly route = inject(ActivatedRoute);
  private readonly modalService = inject(ModalService);
  private readonly toast = inject(ToastService);
  private readonly pageHeader = inject(PageHeaderService);

  /** Actions poussées dans la topbar, comme sur la page Équipe. */
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  /** L'id de soirée du segment `/logistique/:id` ; la liste de courses n'a
   *  de sens que pour une soirée précise. */
  private readonly eventId = this.route.snapshot.paramMap.get('id') ?? '';

  constructor() {
    // `set()` et `setActions()` vivent dans le MÊME effect, dans cet ordre :
    // `set()` réinitialise les actions à `null`, donc les séparer viderait la
    // topbar au premier passage, silencieusement. Regrouper les deux ici sert
    // aussi le sous-titre, qui doit suivre le nom de la soirée une fois la
    // liste chargée — encore une raison de ne jamais appeler `set()` seul.
    effect(() => {
      const eventName = this.store.shoppingList()?.eventName;
      this.pageHeader.set({
        title: 'Logistique',
        subtitle: eventName ? `Liste de courses · ${eventName}` : 'Liste de courses',
        breadcrumb: ['Préparation', 'Logistique', 'Courses'],
        activeNavId: 'log',
      });
      // Dans le premier passage (avant que la vue existe), `actionsTpl()` vaut
      // `undefined` : l'effect se redéclenchera de lui-même quand le gabarit
      // apparaîtra, puisqu'il est lu ici.
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  ngOnInit(): void {
    void this.store.load();
    void this.store.loadShoppingList(this.eventId);
  }

  protected readonly icTicket = LucideTicket;
  protected readonly icDownload = LucideDownload;
  protected readonly icUpload = LucideUpload;
  protected readonly icPlus = LucidePlus;
  protected readonly icLock = LucideLock;
  protected readonly icEdit = LucidePencil;
  protected readonly icTrash = LucideTrash2;

  protected readonly vouchers = this.store.vouchers;
  protected readonly savingVoucherIds = this.store.savingVoucherIds;
  protected readonly voucherError = this.store.voucherError;
  protected readonly voucherErrorId = this.store.voucherErrorId;
  protected readonly vouchersForbidden = this.store.vouchersForbidden;
  protected readonly vouchersLoadError = this.store.vouchersLoadError;
  /** Chargement du catalogue/bons/enseignes — pilote uniquement le panneau bons. */
  protected readonly loading = this.store.loading;

  protected readonly shoppingList = this.store.shoppingList;
  protected readonly shoppingListLoading = this.store.shoppingListLoading;
  protected readonly shoppingListForbidden = this.store.shoppingListForbidden;
  protected readonly shoppingListLoadError = this.store.shoppingListLoadError;

  /**
   * Vrai quand aucune donnée exploitable n'est disponible pour la soirée :
   * refus (403) ou panne. Les deux cas affichent les mêmes KPI à « — », par
   * le même raisonnement que `usableVoucherLabel` sur le panneau des bons —
   * un « 0 » affirmerait à tort une liste vide.
   */
  protected readonly shoppingListUnavailable = computed(() => this.shoppingList() === null);

  private readonly lines = computed<readonly ApiShoppingLine[]>(
    () => this.shoppingList()?.lines ?? [],
  );

  /** Lignes « denrée » : celles qui ont des enseignes à comparer. */
  protected goodLines(lines: readonly ApiShoppingLine[]): ApiShoppingLine[] {
    return lines.filter((line) => line.kind === 'good');
  }

  /** Lignes « non-alimentaire » : `furnitures` n'a aucune relation fournisseur. */
  protected furnitureLines(lines: readonly ApiShoppingLine[]): ApiShoppingLine[] {
    return lines.filter((line) => line.kind === 'furniture');
  }

  /** Une colonne par enseigne effectivement présente sur les denrées de la soirée. */
  protected readonly retailerColumns = computed(() =>
    buildRetailerColumns(this.goodLines(this.lines())),
  );

  protected readonly goodRows = computed<GoodRow[]>(() => {
    const columns = this.retailerColumns();
    return this.goodLines(this.lines()).map((line) => buildGoodRow(line, columns));
  });

  protected readonly furnitureRows = computed(() => this.furnitureLines(this.lines()));

  protected readonly hasSuppliers = computed(() => this.retailerColumns().length > 0);

  /**
   * Totaux par enseigne calculés côté back sur la liste entière, réalignés
   * sur l'ordre des colonnes affichées. Aucun recalcul local : l'API connaît
   * déjà `fullCoverage`, qui dépend de *toutes* les lignes, pas seulement de
   * celles visibles dans ce tableau.
   */
  protected readonly supplierTotals = computed<ApiShoppingSupplierTotal[]>(() => {
    const totals = new Map(this.shoppingList()?.supplierTotals.map((t) => [t.id, t]) ?? []);
    return this.retailerColumns().map(
      (column) =>
        totals.get(column.id) ?? {
          id: column.id,
          name: column.name,
          total: 0,
          fullCoverage: false,
        },
    );
  });

  /**
   * Une enseigne à couverture partielle n'est pas comparable aux autres :
   * elle ne « gagne » que parce qu'elle price moins de lignes, jamais parce
   * qu'elle serait réellement moins chère sur le panier complet.
   */
  protected isComparable(total: ApiShoppingSupplierTotal): boolean {
    return total.fullCoverage;
  }

  /** La moins chère des enseignes réellement comparables ; `null` si aucune ne l'est. */
  protected cheapestComparable(
    totals: readonly ApiShoppingSupplierTotal[],
  ): ApiShoppingSupplierTotal | null {
    const comparable = totals.filter((total) => this.isComparable(total));
    if (comparable.length === 0) return null;
    return comparable.reduce((best, total) => (total.total < best.total ? total : best));
  }

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

  /** `—` quand aucune enseigne ne couvre toute la liste : aucune comparaison honnête n'existe. */
  protected savingsLabel(savings: number | null): string {
    return savings === null ? '—' : `${this.formatPrice(savings)} €`;
  }

  protected readonly lineCountLabel = computed(() =>
    this.shoppingListUnavailable() ? '—' : `${this.shoppingList()!.lineCount}`,
  );

  protected readonly optimumTotalLabel = computed(() =>
    this.shoppingListUnavailable()
      ? '—'
      : `${this.formatPrice(this.shoppingList()!.optimumTotal)} €`,
  );

  protected readonly optimumGoodsTotalLabel = computed(() =>
    this.shoppingListUnavailable()
      ? '—'
      : `${this.formatPrice(this.shoppingList()!.totals.optimumGoodsTotal)} €`,
  );

  protected readonly furnitureTotalLabel = computed(() =>
    this.shoppingListUnavailable()
      ? '—'
      : `${this.formatPrice(this.shoppingList()!.totals.furnitureTotal)} €`,
  );

  protected readonly savingsKpiLabel = computed(() =>
    this.shoppingListUnavailable() ? '—' : this.savingsLabel(this.shoppingList()!.savings),
  );

  /** `unpricedCount > 0` : ces lignes ne comptent pas dans `optimumTotal`, et
   *  le taire ferait passer un total incomplet pour un total. */
  protected readonly unpricedCount = computed(() => this.shoppingList()?.unpricedCount ?? 0);

  protected retryShoppingList(): void {
    void this.store.loadShoppingList(this.eventId);
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

  /**
   * Met en avant, en pied de tableau, la seule enseigne comparable la moins
   * chère — l'équivalent, au niveau de la colonne, du badge qui marque déjà
   * la moins chère de chaque ligne.
   */
  protected totalClass(total: ApiShoppingSupplierTotal): string {
    if (!this.isComparable(total)) return 'text-muted/60';
    return this.cheapestComparable(this.supplierTotals())?.id === total.id
      ? 'text-ok font-semibold'
      : 'text-text-2';
  }

  /** Screen-reader wording for a column total that only covers part of the basket. */
  protected totalHint(total: ApiShoppingSupplierTotal): string | null {
    return this.isComparable(total)
      ? null
      : 'Total partiel : cette enseigne ne référence pas tous les articles de la liste';
  }

  protected openCreateVoucher(): void {
    this.modalService.open({ type: 'component', component: VoucherCreateModal, inputs: {} });
  }

  protected openEditVoucher(voucher: VoucherCard): void {
    this.modalService.open({
      type: 'component',
      component: VoucherEditModal,
      inputs: { voucherId: voucher.id },
    });
  }

  protected confirmDeleteVoucher(voucher: VoucherCard): void {
    this.modalService.open({
      type: 'delete',
      title: "Supprimer le bon d'achat",
      message: `Le bon ${voucher.supplierName} de ${this.formatPrice(voucher.value)} € sera définitivement supprimé.`,
      onConfirm: () => void this.deleteVoucher(voucher),
    });
  }

  private async deleteVoucher(voucher: VoucherCard): Promise<void> {
    const ok = await this.store.deleteVoucher(voucher.id);
    if (!ok) {
      const error = this.voucherErrorId() === voucher.id ? this.voucherError() : null;
      this.toast.show({
        type: 'error',
        title: 'Suppression refusée',
        message: error ?? "Impossible de supprimer ce bon d'achat.",
      });
      return;
    }
    this.toast.show({
      type: 'success',
      title: "Bon d'achat supprimé",
      message: `${voucher.supplierName} · ${this.formatPrice(voucher.value)} €`,
    });
  }

  protected isSaving(id: number): boolean {
    return this.savingVoucherIds().includes(id);
  }

  protected async toggleVoucher(voucher: VoucherCard): Promise<void> {
    const used = !voucher.used;
    await this.store.toggleVoucherUsed(voucher.id, used);

    const error = this.voucherErrorId() === voucher.id ? this.voucherError() : null;
    this.toast.show(
      error
        ? { type: 'error', title: 'Mise à jour refusée', message: error }
        : {
            type: 'success',
            title: used ? 'Bon consommé' : 'Consommation annulée',
            message: `${voucher.supplierName} · ${this.formatPrice(voucher.value)} €`,
          },
    );
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
