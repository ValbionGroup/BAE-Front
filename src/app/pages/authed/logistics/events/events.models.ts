// src/app/pages/authed/logistics/events/events.models.ts

export interface EventItem {
  id: number;
  name: string;
  date: string; // ISO date
  recipeCount: number;
}

export interface EventRecipe {
  recipeId: number;
  recipeName: string;
  servings: number;
  totalCost: number;
}

export interface ShoppingItem {
  productName: string;
  quantity: number;
  unit: string;
  totalPrice: number;
}

export interface StoreGroup {
  storeName: string;
  items: ShoppingItem[];
  storeTotal: number;
}

export interface EventDetail {
  id: number;
  name: string;
  date: string;
  recipes: EventRecipe[];
  shoppingList: {
    grandTotal: number;
    byStore: StoreGroup[];
  };
}

export interface AvailableRecipe {
  id: number;
  name: string;
  category: string;
}

export type DrawerMode = 'add' | 'edit' | null;

export interface DrawerSaveEvent {
  recipeId: number;
  servings: number;
}
