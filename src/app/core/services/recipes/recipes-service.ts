import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  Recipe,
  RecipeApiDto,
  RecipeDetailApiDto,
  RecipeIngredient,
  RecipeIngredientApiDto,
} from '#core/models/recipe.model';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { ApiEndPointV1 } from '#core/models/endpoint.model';

export type { Recipe, RecipeUsage } from '#core/models/recipe.model';

@Injectable({ providedIn: 'root' })
export class RecipesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  fetchAll(): Observable<Recipe[]> {
    const url = this.buildUrl(ApiEndPointV1.RECIPES);
    return this.http
      .get<RecipeApiDto[]>(url)
      .pipe(map((dtos) => dtos.map((d) => this.toRecipe(d))));
  }

  fetchDetail(id: string): Observable<{
    ingredients: RecipeIngredient[];
    methode: string[];
  }> {
    const url = this.buildUrl(ApiEndPointV1.RECIPE_DETAIL).replace(':id', id);
    return this.http.get<RecipeDetailApiDto>(url).pipe(
      map((dto) => ({
        ingredients: dto.ingredients.map((i) => this.toIngredient(i)),
        methode: dto.methode,
      })),
    );
  }

  private toRecipe(dto: RecipeApiDto): Recipe {
    return {
      id: dto.id,
      nom: dto.nom,
      ing: dto.ing,
      cout: dto.cout,
      prix: dto.prix,
      marge: dto.marge,
      star: dto.star,
      usage: dto.usage,
    };
  }

  private toIngredient(dto: RecipeIngredientApiDto): RecipeIngredient {
    return {
      n: dto.n,
      q: dto.q,
      c: dto.c,
      lot: dto.lot,
      stock: dto.stock,
      warn: dto.warn,
    };
  }

  private buildUrl(endpoint: ApiEndPointV1): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
