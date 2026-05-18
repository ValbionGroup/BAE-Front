import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
  untracked,
} from '@angular/core';
import {
  LucideChefHat,
  LucideDynamicIcon,
  LucideEllipsis,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideStar,
} from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { RecipesStore } from '#core/store/recipes.store';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Input } from '#shared/components/ui/input/input';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';

@Component({
  selector: 'bfd-recettes',
  imports: [Btn, Badge, Input, Skeleton, LucideDynamicIcon],
  templateUrl: './recettes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recettes {
  private readonly store = inject(RecipesStore);

  constructor() {
    inject(PageHeaderService).set({
      title: 'Recettes',
      subtitle: 'Catalogue des recettes',
      breadcrumb: ['Préparation', 'Recettes'],
      activeNavId: 'recettes',
    });
    effect(() => {
      const id = this.selectedId();
      if (!id) return;
      const r = this.store.byId(id);
      if (!r || r.detailStatus !== 'init') return;
      untracked(() => void this.store.loadRecipeDetail(id));
    });
    effect(() => {
      if (this.selectedId()) return;
      const first = this.recettes()[0];
      if (first) untracked(() => this.selectedId.set(first.id));
    });
  }

  protected readonly icChef = LucideChefHat;
  protected readonly icSearch = LucideSearch;
  protected readonly icPlus = LucidePlus;
  protected readonly icEdit = LucidePencil;
  protected readonly icMore = LucideEllipsis;
  protected readonly icStar = LucideStar;

  protected readonly filterTabs = ['Tout', 'Plats', 'Accompagnements', 'Boissons', 'Desserts'];
  protected readonly activeFilter = signal(0);
  protected readonly selectedId = signal<string | null>(null);

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;
  protected readonly recettes = this.store.allRecipes;

  protected readonly selectedRecipe = computed(() => {
    const id = this.selectedId();
    return id ? this.store.byId(id) : undefined;
  });

  protected readonly detailLoading = computed(() => {
    const r = this.selectedRecipe();
    if (!r) return false;
    const s = r.detailStatus;
    return s === 'init' || s === 'loading' || s === 'refreshing';
  });

  protected readonly detailError = computed(() => this.selectedRecipe()?.detailStatus === 'error');

  protected readonly r3: readonly null[] = [null, null, null];
  protected readonly r5: readonly null[] = [null, null, null, null, null];

  protected select(id: string): void {
    this.selectedId.set(id);
  }

  protected formatPrice(n: number): string {
    return n.toFixed(2).replace('.', ',');
  }
}
