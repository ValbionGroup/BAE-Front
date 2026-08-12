import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import {
  LucideChefHat,
  LucideDownload,
  LucideDynamicIcon,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideStar,
  LucideTrash2,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { RecipesStore } from '#core/store/recipes.store';
import { PrintService } from '#core/services/print/print-service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { ModalService } from '#shared/components/modal/modal.service';
import { RecipeEditModal } from '#shared/components/modal/recipe-edit-modal/recipe-edit-modal';
import { ToastService } from '#shared/components/toast/toast.service';
import type { RecipeIngredient, RecipeProduct } from './recipes.types';

interface RecetteRow {
  readonly id: number;
  readonly nom: string;
  readonly star: boolean;
  readonly usage: string;
  readonly ing: number;
  readonly cout: number | null;
  readonly prix: number | null;
  readonly marge: number | null;
}

interface RecetteIngredientRow {
  readonly n: string;
  readonly lot: string;
  readonly q: string;
  readonly c: number | null;
  readonly warn: boolean;
  readonly stock: string;
}

interface RecetteDetail extends RecetteRow {
  readonly ingredients: readonly RecetteIngredientRow[];
  readonly methode: readonly string[];
}

@Component({
  selector: 'bfd-recettes',
  imports: [Btn, Badge, Input, Skeleton, LucideDynamicIcon],
  templateUrl: './recettes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  // Sans hauteur sur l'hôte, le `h-full` du gabarit ne résout rien et c'est
  // l'app-shell qui défile, liste et détail d'un seul bloc.
  host: { class: 'block h-full' },
})
export class Recettes {
  protected readonly store = inject(RecipesStore);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);
  private readonly printService = inject(PrintService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly icChef = LucideChefHat;
  protected readonly icSearch = LucideSearch;
  protected readonly icEdit = LucidePencil;
  protected readonly icPlus = LucidePlus;
  protected readonly icTrash = LucideTrash2;
  protected readonly icStar = LucideStar;
  protected readonly icDownload = LucideDownload;

  protected readonly r5 = Array(5).fill(null);
  protected readonly r3 = Array(3).fill(null);

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;

  private readonly _filterTabs = computed(() => {
    const cats = [
      ...new Set(
        this.store
          .products()
          .map((p) => p.category)
          .filter((c): c is string => c !== null),
      ),
    ];
    return ['Tout', ...cats, 'Végé'];
  });

  protected get filterTabs(): string[] {
    return this._filterTabs();
  }

  protected readonly activeFilter = signal<number>(0);
  protected readonly searchQuery = signal('');

  protected readonly recettes = computed<RecetteRow[]>(() => {
    const tabs = this._filterTabs();
    const filter = tabs[this.activeFilter()] ?? 'Tout';
    const q = this.searchQuery().toLowerCase().trim();
    return this.store
      .products()
      .filter((p) => {
        if (filter === 'Végé' && !p.isVegetarian) return false;
        if (filter !== 'Tout' && filter !== 'Végé' && p.category !== filter) return false;
        if (q && !p.name.toLowerCase().includes(q)) return false;
        return true;
      })
      .map((p) => this.toRow(p));
  });

  protected readonly selectedId = signal<number | null>(null);
  private readonly rawIngredients = signal<readonly RecipeIngredient[]>([]);
  private readonly _detailLoading = signal(false);
  private readonly _detailError = signal(false);
  /**
   * Force le rechargement des ingrédients après une écriture. Réaffecter
   * `selectedId` ne suffit pas : éditer la recette déjà sélectionnée y remet la
   * même valeur, et un signal ne notifie pas sur une valeur identique.
   */
  private readonly detailVersion = signal(0);

  protected readonly detailLoading = this._detailLoading;
  protected readonly detailError = this._detailError;

  protected readonly selectedRecipe = computed<RecetteDetail | null>(() => {
    const id = this.selectedId();
    if (id === null) return null;
    const p = this.store.products().find((x) => x.id === id);
    if (!p) return null;
    const raw = this.rawIngredients();
    return {
      ...this.toRow(p),
      ingredients: raw.map((g) => this.toIngredientRow(g)),
      methode: raw.filter((g) => g.instruction).map((g) => g.instruction!),
    };
  });

  constructor() {
    const pageHeader = inject(PageHeaderService);
    pageHeader.set({
      title: 'Recettes',
      subtitle: 'Chargement…',
      breadcrumb: ['Préparation', 'Recettes'],
      activeNavId: 'recettes',
    });

    // ⚠️ Un seul effect, dans cet ordre : `set()` remet les actions à `null`,
    // donc un effect séparé effacerait les boutons au premier chargement.
    effect(() => {
      const products = this.store.products();
      pageHeader.set({
        title: 'Recettes',
        subtitle: `${products.length} produit${products.length !== 1 ? 's' : ''}`,
        breadcrumb: ['Préparation', 'Recettes'],
        activeNavId: 'recettes',
      });
      const tpl = this.actionsTpl();
      if (tpl) pageHeader.setActions(tpl);
    });

    effect(() => {
      const id = this.selectedId();
      this.detailVersion();
      if (id === null) return;
      this.rawIngredients.set([]);
      this._detailLoading.set(true);
      this._detailError.set(false);
      void this.store
        .getIngredients(id)
        .then((ingredients) => {
          this.rawIngredients.set(ingredients);
          this._detailLoading.set(false);
        })
        .catch(() => {
          this._detailLoading.set(false);
          this._detailError.set(true);
        });
    });

    void this.store.load();
  }

  protected select(id: number): void {
    this.selectedId.set(id);
  }

  protected openCreate(): void {
    this.openEditor(null);
  }

  protected openEdit(recipeId: number): void {
    this.openEditor(recipeId);
  }

  protected printRecipe(recipeId: number, nom: string): void {
    this.printService.download(`/products/${recipeId}/recipe/pdf`, `fiche-recette-${nom}.pdf`);
  }

  private openEditor(recipeId: number | null): void {
    this.modal.open({
      type: 'component',
      component: RecipeEditModal,
      inputs: { recipeId, saved: (id: number) => this.onSaved(id) },
    });
  }

  /** La liste est rechargée par le store ; le panneau de détail, lui, tient
   *  ses ingrédients d'un second endpoint qu'il faut redemander. */
  private onSaved(recipeId: number): void {
    this.selectedId.set(recipeId);
    this.detailVersion.update((version) => version + 1);
  }

  protected confirmDelete(recipeId: number, nom: string): void {
    this.store.clearDeleteError();
    this.modal.open({
      type: 'delete',
      title: 'Supprimer la recette',
      message: `« ${nom} » sera retirée du catalogue.`,
      details:
        'Refusé si la recette figure déjà dans une commande, une précommande ou un menu de soirée.',
      onConfirm: () => void this.deleteRecipe(recipeId, nom),
    });
  }

  private async deleteRecipe(recipeId: number, nom: string): Promise<void> {
    const ok = await this.store.deleteRecipe(recipeId);
    if (!ok) return;
    if (this.selectedId() === recipeId) this.selectedId.set(null);
    this.toast.show({
      type: 'success',
      title: 'Recette supprimée',
      message: `« ${nom} » n'est plus au catalogue.`,
    });
  }

  protected setSearch(q: string): void {
    this.searchQuery.set(q);
  }

  protected formatPrice(n: number): string {
    return Number(n).toFixed(2).replace('.', ',');
  }

  private toRow(p: RecipeProduct): RecetteRow {
    const cout = p.cost !== null ? Number(p.cost) : null;
    const prix = p.lastPrice !== null ? Number(p.lastPrice) : null;
    return {
      id: p.id,
      nom: p.name,
      star: false,
      usage: p.category ?? 'Sans catégorie',
      ing: p.ingredientCount,
      cout,
      prix,
      marge: cout !== null && prix !== null ? prix - cout : null,
    };
  }

  private toIngredientRow(g: RecipeIngredient): RecetteIngredientRow {
    const qtyNum = g.quantity !== null ? Number(g.quantity) : null;
    const formatted =
      qtyNum !== null
        ? qtyNum % 1 === 0
          ? String(Math.round(qtyNum))
          : qtyNum.toFixed(1).replace('.', ',')
        : null;
    return {
      n: g.name,
      lot: '—',
      q: formatted !== null ? `${formatted} ${g.unit}` : g.unit,
      c: g.unitPrice !== null ? Number(g.unitPrice) : null,
      warn: false,
      stock: String(g.stockQty),
    };
  }
}
