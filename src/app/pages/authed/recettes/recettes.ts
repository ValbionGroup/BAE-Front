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
  LucideLeaf,
  LucidePencil,
  LucidePlus,
  LucideSearch,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { RecipesStore } from '#core/store/recipes.store';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';
import type { RecipeIngredient, RecipeProduct } from './recipes.types';

@Component({
  selector: 'bfd-recettes',
  imports: [Btn, Badge, Input, LucideDynamicIcon],
  templateUrl: './recettes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recettes {
  protected readonly store = inject(RecipesStore);

  protected readonly icChef = LucideChefHat;
  protected readonly icSearch = LucideSearch;
  protected readonly icPlus = LucidePlus;
  protected readonly icEdit = LucidePencil;
  protected readonly icLeaf = LucideLeaf;

  protected readonly searchQuery = signal('');
  protected readonly activeFilter = signal('Tout');

  protected readonly selectedId = signal<number | null>(null);
  protected readonly selectedIngredients = signal<readonly RecipeIngredient[]>([]);
  protected readonly ingredientsLoading = signal(false);

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;

  protected readonly categoryTabs = computed(() => {
    const cats = this.store
      .products()
      .map((p) => p.category)
      .filter((c): c is string => c !== null);
    return ['Tout', ...new Set(cats), 'Végé'];
  });

  protected readonly visibleProducts = computed(() => {
    const filter = this.activeFilter();
    const q = this.searchQuery().toLowerCase().trim();
    return this.store.products().filter((p) => {
      if (filter === 'Végé' && !p.isVegetarian) return false;
      if (filter !== 'Tout' && filter !== 'Végé' && p.category !== filter) return false;
      if (q && !p.name.toLowerCase().includes(q)) return false;
      return true;
    });
  });

  protected readonly selectedProduct = computed<RecipeProduct | null>(
    () => this.store.products().find((p) => p.id === this.selectedId()) ?? null,
  );

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
      this.ingredientsLoading.set(true);
      void this.store.getIngredients(id).then((ingredients) => {
        this.selectedIngredients.set(ingredients);
        this.ingredientsLoading.set(false);
      });
    });

    void this.store.load();
  }

  protected select(id: number): void {
    this.selectedIngredients.set([]);
    this.selectedId.set(id);
  }

  protected setSearch(q: string): void {
    this.searchQuery.set(q);
  }

  protected formatPrice(n: number): string {
    return Number(n).toFixed(2).replace('.', ',');
  }
}
