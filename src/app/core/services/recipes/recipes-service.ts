import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { RecipeIngredient, RecipeProduct } from '#pages/authed/recettes/recipes.types';

export type { RecipeProduct, RecipeIngredient };

@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(): Observable<RecipeProduct[]> {
    return this.http.get<RecipeProduct[]>(`${this.baseUrl}/products`);
  }

  getIngredients(productId: number): Observable<RecipeIngredient[]> {
    return this.http.get<RecipeIngredient[]>(`${this.baseUrl}/products/${productId}/ingredients`);
  }
}
