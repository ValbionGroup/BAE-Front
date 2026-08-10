import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { RecipesService, type ApiRecipeDetail } from '#core/services/recipes/recipes-service';
import type { LoadingStatus } from '#core/models/global.model';
import { messageOf } from '#shared/utils/api-error';
import type {
  RecipeIngredient,
  RecipeProduct,
  RecipeWritePayload,
} from '#pages/authed/recettes/recipes.types';

interface RecipesState {
  loading: LoadingStatus;
  loadError: string | null;
  products: RecipeProduct[];
  /** Une écriture est en vol : la modale désactive son bouton d'envoi. */
  saving: boolean;
  saveError: string | null;
  /** Refus de suppression (409 « recette utilisée »), affiché sur la page et
   *  non dans la modale — celle-ci est déjà fermée quand il arrive. */
  deleteError: string | null;
}

const initialState: RecipesState = {
  loading: 'init',
  loadError: null,
  products: [],
  saving: false,
  saveError: null,
  deleteError: null,
};

export const RecipesStore = signalStore(
  { providedIn: 'root' },
  withState<RecipesState>(initialState),
  withMethods((store) => {
    const svc = inject(RecipesService);

    /**
     * Recharge la liste depuis `GET /products/summary` après chaque écriture.
     * Coût, marge, catégorie et nombre d'ingrédients y sont **calculés côté
     * back** : les recomposer ici donnerait un second calcul à maintenir, et
     * deux vérités dès qu'un prix fournisseur change.
     */
    async function reload(): Promise<void> {
      const products = await lastValueFrom(svc.getAll());
      patchState(store, { products });
    }

    return {
      async load(): Promise<void> {
        if (store.loading() === 'loaded' || store.loading() === 'loading') return;
        patchState(store, { loading: 'loading', loadError: null });
        try {
          await reload();
          patchState(store, { loading: 'loaded' });
        } catch {
          patchState(store, { loading: 'error', loadError: 'Impossible de charger les recettes.' });
        }
      },

      /** Rechargement explicite : `load()` sortirait aussitôt, l'état étant
       *  déjà `loaded`. */
      async refresh(): Promise<void> {
        try {
          await reload();
        } catch {
          patchState(store, { loadError: 'Impossible de recharger les recettes.' });
        }
      },

      async getIngredients(productId: number): Promise<RecipeIngredient[]> {
        return lastValueFrom(svc.getIngredients(productId));
      },

      /** Entête complet d'une recette. La liste ne porte ni `description` ni
       *  `recipe` : seul cet appel les connaît. */
      async getDetail(productId: number): Promise<ApiRecipeDetail> {
        return lastValueFrom(svc.getOne(productId));
      },

      /** Non optimiste : la recette n'a pas d'id avant la réponse, la liste est
       *  triée par nom, et son coût dépend d'un calcul serveur. */
      async createRecipe(payload: RecipeWritePayload): Promise<number | null> {
        if (store.saving()) return null;
        patchState(store, { saving: true, saveError: null });
        try {
          const created = await lastValueFrom(svc.create(payload));
          await reload();
          return created.id;
        } catch (error) {
          patchState(store, { saveError: messageOf(error, 'Impossible de créer cette recette.') });
          return null;
        } finally {
          patchState(store, { saving: false });
        }
      },

      async updateRecipe(productId: number, payload: RecipeWritePayload): Promise<boolean> {
        if (store.saving()) return false;
        patchState(store, { saving: true, saveError: null });
        try {
          await lastValueFrom(svc.update(productId, payload));
          await reload();
          return true;
        } catch (error) {
          patchState(store, {
            saveError: messageOf(error, 'Impossible d’enregistrer cette recette.'),
          });
          return false;
        } finally {
          patchState(store, { saving: false });
        }
      },

      /**
       * Le refus le plus probable est un 409 : la recette est référencée par une
       * commande, une précommande ou un menu de soirée. Son message vient de
       * l'API parce qu'il nomme ce qui bloque — un texte codé en dur ne le
       * pourrait pas.
       */
      async deleteRecipe(productId: number): Promise<boolean> {
        patchState(store, { deleteError: null });
        try {
          await lastValueFrom(svc.remove(productId));
          await reload();
          return true;
        } catch (error) {
          patchState(store, {
            deleteError: messageOf(error, 'Impossible de supprimer cette recette.'),
          });
          return false;
        }
      },

      clearSaveError(): void {
        patchState(store, { saveError: null });
      },

      clearDeleteError(): void {
        patchState(store, { deleteError: null });
      },
    };
  }),
);
