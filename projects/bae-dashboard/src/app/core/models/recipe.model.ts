import { LoadingStatus } from '#core/models/global.model';

export type RecipeUsage = 'Plat principal' | 'Accompagnement' | 'Boisson' | 'Dessert' | 'Végé';

export interface Recipe {
  readonly id: string;
  readonly nom: string;
  readonly ing: number;
  readonly cout: number;
  readonly prix: number;
  readonly marge: number;
  readonly star: boolean;
  readonly usage: RecipeUsage;
}

export interface RecipeIngredient {
  readonly n: string;
  readonly q: string;
  readonly c: number;
  readonly lot: string;
  readonly stock: string | number;
  readonly warn: boolean;
}

export interface RecipeDetail extends Recipe {
  ingredients?: RecipeIngredient[];
  methode?: string[];
  detailStatus?: LoadingStatus;
}

export interface RecipeApiDto {
  id: string;
  nom: string;
  ing: number;
  cout: number;
  prix: number;
  marge: number;
  star: boolean;
  usage: RecipeUsage;
}

export interface RecipeIngredientApiDto {
  n: string;
  q: string;
  c: number;
  lot: string;
  stock: string | number;
  warn: boolean;
}

export interface RecipeDetailApiDto {
  ingredients: RecipeIngredientApiDto[];
  methode: string[];
}
