import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';
import type {
  RecipeIngredient,
  RecipeProduct,
  RecipeWritePayload,
} from '#pages/authed/recettes/recipes.types';

/**
 * Une fourniture de la recette, telle que `GET /products/:id` la sert.
 *
 * ⚠️ `quantity` est celle du **pivot** — ce que la recette consomme — et non le
 * stock de la fourniture, que `GET /furnitures` porte sous le même nom.
 */
export interface ApiRecipeFurniture {
  readonly id: number;
  readonly name: string;
  readonly quantity: number;
}

export type { RecipeProduct, RecipeIngredient, RecipeWritePayload };

/** Ligne `products` renvoyée par les écritures — sans les agrégats de coût,
 *  que seul `GET /products/summary` calcule. */
export interface ApiWrittenRecipe {
  readonly id: number;
  readonly name: string;
}

/**
 * `GET /products/:id`. Indispensable à l'édition : `products/summary` ne
 * renvoie **ni `description` ni `recipe`**, donc ouvrir un formulaire d'édition
 * à partir de la liste effacerait ces deux colonnes à l'enregistrement.
 */
export interface ApiRecipeDetail {
  readonly id: number;
  readonly name: string;
  readonly isVegetarian: boolean | null;
  readonly description: string | null;
  readonly recipe: string | null;
  /** La catégorie de **vente** ; `null` = non classée, ce n'est pas une anomalie. */
  readonly productCategoryId: number | null;
  readonly furnitures: readonly ApiRecipeFurniture[];
}

@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(): Observable<RecipeProduct[]> {
    return this.http.get<RecipeProduct[]>(`${this.baseUrl}/products/summary`);
  }

  getIngredients(productId: number): Observable<RecipeIngredient[]> {
    return this.http.get<RecipeIngredient[]>(`${this.baseUrl}/products/${productId}/ingredients`);
  }

  getOne(productId: number): Observable<ApiRecipeDetail> {
    return this.http.get<ApiRecipeDetail>(`${this.baseUrl}/products/${productId}`);
  }

  create(payload: RecipeWritePayload): Observable<ApiWrittenRecipe> {
    return this.http.post<ApiWrittenRecipe>(`${this.baseUrl}/products`, payload);
  }

  /**
   * `PUT` et non `PATCH` : le contrôleur réécrit les quatre colonnes d'entête à
   * chaque appel, donc un corps partiel effacerait celles qu'il omet. L'écran
   * envoie toujours la recette entière.
   */
  update(productId: number, payload: RecipeWritePayload): Observable<ApiWrittenRecipe> {
    return this.http.put<ApiWrittenRecipe>(`${this.baseUrl}/products/${productId}`, payload);
  }

  remove(productId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/products/${productId}`);
  }
}
