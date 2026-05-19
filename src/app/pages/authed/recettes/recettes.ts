import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import {
  LucideChefHat,
  LucideDynamicIcon,
  LucideMoreHorizontal,
  LucidePencil,
  LucideSearch,
  LucideStar,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { RecipesStore } from '#core/store/recipes.store';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
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
})
export class Recettes {
  protected readonly store = inject(RecipesStore);

  protected readonly icChef = LucideChefHat;
  protected readonly icSearch = LucideSearch;
  protected readonly icEdit = LucidePencil;
  protected readonly icMore = LucideMoreHorizontal;
  protected readonly icStar = LucideStar;

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

    effect(() => {
      const products = this.store.products();
      pageHeader.set({
        title: 'Recettes',
        subtitle: `${products.length} produit${products.length !== 1 ? 's' : ''}`,
        breadcrumb: ['Préparation', 'Recettes'],
        activeNavId: 'recettes',
      });
    });

    effect(() => {
      const id = this.selectedId();
      if (id === null) return;
      this.rawIngredients.set([]);
      this._detailLoading.set(true);
      this._detailError.set(false);
      void this.store.getIngredients(id).then((ingredients) => {
        this.rawIngredients.set(ingredients);
        this._detailLoading.set(false);
      }).catch(() => {
        this._detailLoading.set(false);
        this._detailError.set(true);
      });
    });

    void this.store.load();
  }

  protected select(id: number): void {
    this.selectedId.set(id);
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
