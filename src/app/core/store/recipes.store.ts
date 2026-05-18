import {
  patchState,
  signalStore,
  withComputed,
  withHooks,
  withMethods,
  withState,
} from '@ngrx/signals';
import { computed, inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { RecipesService } from '#core/services/recipes/recipes-service';
import { Recipe, RecipeDetail } from '#core/models/recipe.model';
import { LoadingStatus } from '#core/models/global.model';

interface RecipesState {
  readonly loading: LoadingStatus;
  readonly loadError: string | null;
  readonly recipes: Record<string, RecipeDetail>;
}

const initialState: RecipesState = {
  loading: 'init',
  loadError: null,
  recipes: {},
};

export const RecipesStore = signalStore(
  { providedIn: 'root' },
  withState<RecipesState>(initialState),
  withComputed(({ recipes }) => ({
    allRecipes: computed<readonly RecipeDetail[]>(() => Object.values(recipes())),
  })),
  withMethods((store, recipesService = inject(RecipesService)) => ({
    byId(id: string): RecipeDetail | undefined {
      return store.recipes()[id];
    },

    async load(): Promise<void> {
      patchState(store, { loading: 'loading', loadError: null });
      try {
        const list = await lastValueFrom(recipesService.fetchAll());
        const dict = list.reduce<Record<string, RecipeDetail>>((acc, r) => {
          acc[r.id] = { ...r, detailStatus: 'init' };
          return acc;
        }, {});
        patchState(store, { recipes: dict, loading: 'loaded' });
      } catch {
        patchState(store, { loading: 'error', loadError: 'Impossible de charger les recettes.' });
      }
    },

    async loadRecipeDetail(id: string): Promise<void> {
      const current = store.recipes()[id];
      if (!current) return;

      const status = current.detailStatus;
      if (status === 'loading' || status === 'refreshing') return;

      patchState(store, (state) => ({
        recipes: {
          ...state.recipes,
          [id]: {
            ...current,
            detailStatus: status === 'loaded' ? 'refreshing' : 'loading',
          } as RecipeDetail,
        },
      }));

      try {
        const detail = await lastValueFrom(recipesService.fetchDetail(id));
        patchState(store, (state) => ({
          recipes: {
            ...state.recipes,
            [id]: {
              ...state.recipes[id],
              ingredients: detail.ingredients,
              methode: detail.methode,
              detailStatus: 'loaded',
            } as RecipeDetail,
          },
        }));
      } catch {
        patchState(store, (state) => ({
          recipes: {
            ...state.recipes,
            [id]: { ...state.recipes[id], detailStatus: 'error' } as RecipeDetail,
          },
        }));
      }
    },

    clear(): void {
      patchState(store, initialState);
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);

export type { Recipe, RecipeDetail };
