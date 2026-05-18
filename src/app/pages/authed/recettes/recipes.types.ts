export interface RecipeIngredient {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  readonly categoryName: string | null;
  readonly stockQty: number;
}

export interface RecipeProduct {
  readonly id: number;
  readonly name: string;
  readonly isVegetarian: boolean;
  readonly category: string | null;
  readonly ingredientCount: number;
  readonly lastPrice: number | null;
}
