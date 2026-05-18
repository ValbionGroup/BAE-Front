import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { RecipesService } from '#core/services/recipes/recipes-service';
import type { LoadingStatus } from '#core/models/global.model';
import type { RecipeIngredient, RecipeProduct } from '#pages/authed/recettes/recipes.types';

interface RecipesState {
  loading: LoadingStatus;
  loadError: string | null;
  products: RecipeProduct[];
}

export const RecipesStore = signalStore(
  { providedIn: 'root' },
  withState<RecipesState>({
    loading: 'init',
    loadError: null,
    products: [],
  }),
  withMethods((store) => {
    const svc = inject(RecipesService);
    return {
      async load(): Promise<void> {
        patchState(store, { loading: 'loading', loadError: null });
        try {
          const products = await lastValueFrom(svc.getAll());
          patchState(store, { loading: 'loaded', products });
        } catch {
          patchState(store, { loading: 'error', loadError: 'Impossible de charger les recettes.' });
        }
      },

      async getIngredients(productId: number): Promise<RecipeIngredient[]> {
        return lastValueFrom(svc.getIngredients(productId));
      },
    };
  }),
);
