import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  LucideChefHat,
  LucidePackage,
  LucidePlus,
  LucideSearch,
  LucideTag,
  LucideUsers,
} from '@lucide/angular';
import {SearchBar} from '#shared/components/search-bar/search-bar';
import {Button} from '#shared/components/button/button';

interface Product {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: number;
  supplier: string;
}

interface RecipeIngredient {
  productName: string;
  quantity: number;
  unit: string;
}

interface Recipe {
  id: number;
  name: string;
  category: string;
  servings: number;
  cost: number;
  ingredients: RecipeIngredient[];
}

@Component({
  selector: 'bfd-recipes',
  imports: [
    LucideSearch,
    LucidePlus,
    LucideChefHat,
    LucidePackage,
    LucideTag,
    LucideUsers,
    SearchBar,
    Button,
  ],
  templateUrl: './recipes.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Recipes {
  protected readonly activeTab = signal<'produits' | 'recettes'>('produits');
  protected readonly searchQuery = signal('');

  protected readonly products = signal<Product[]>([
    { id: 1, name: 'Bière blonde 33cl', category: 'Bières', unit: 'bouteille', price: 0.65, supplier: 'Lidl' },
    { id: 2, name: 'Bière brune 33cl', category: 'Bières', unit: 'bouteille', price: 0.72, supplier: 'Lidl' },
    { id: 3, name: 'Coca-Cola 33cl', category: 'Softs', unit: 'cannette', price: 0.45, supplier: 'Costco' },
    { id: 4, name: 'Eau minérale 50cl', category: 'Softs', unit: 'bouteille', price: 0.19, supplier: 'Lidl' },
    { id: 5, name: 'Vin rouge 75cl', category: 'Vins', unit: 'bouteille', price: 3.49, supplier: 'Lidl' },
    { id: 6, name: 'Chips nature 150g', category: 'Snacks', unit: 'sachet', price: 0.75, supplier: 'Costco' },
    { id: 7, name: "Jus d'orange 1L", category: 'Softs', unit: 'brique', price: 0.99, supplier: 'Costco' },
    { id: 8, name: 'Rhum 70cl', category: 'Spiritueux', unit: 'bouteille', price: 8.90, supplier: 'Auchan' },
    { id: 9, name: 'Vodka 70cl', category: 'Spiritueux', unit: 'bouteille', price: 9.50, supplier: 'Carrefour' },
    { id: 10, name: 'Sirop de grenadine', category: 'Sirops', unit: 'bouteille', price: 2.20, supplier: 'Auchan' },
    { id: 11, name: 'Citron vert', category: 'Fruits', unit: 'pièce', price: 0.45, supplier: 'Marché' },
    { id: 12, name: 'Menthe fraîche', category: 'Herbes', unit: 'botte', price: 1.20, supplier: 'Marché' },
    { id: 13, name: 'Sucre en poudre 1kg', category: 'Épicerie', unit: 'kg', price: 1.05, supplier: 'Lidl' },
    { id: 14, name: 'Eau gazeuse 1L', category: 'Softs', unit: 'bouteille', price: 0.55, supplier: 'Lidl' },
  ]);

  protected readonly recipes = signal<Recipe[]>([
    {
      id: 1,
      name: 'Mojito',
      category: 'Cocktails',
      servings: 1,
      cost: 1.85,
      ingredients: [
        { productName: 'Rhum 70cl', quantity: 4, unit: 'cl' },
        { productName: 'Citron vert', quantity: 0.5, unit: 'pièce' },
        { productName: 'Menthe fraîche', quantity: 0.1, unit: 'botte' },
        { productName: 'Sucre en poudre', quantity: 10, unit: 'g' },
        { productName: 'Eau gazeuse 1L', quantity: 15, unit: 'cl' },
      ],
    },
    {
      id: 2,
      name: 'Panaché',
      category: 'Cocktails',
      servings: 1,
      cost: 0.75,
      ingredients: [
        { productName: 'Bière blonde 33cl', quantity: 1, unit: 'bouteille' },
        { productName: 'Eau gazeuse 1L', quantity: 10, unit: 'cl' },
      ],
    },
    {
      id: 3,
      name: 'Sangria',
      category: 'Cocktails',
      servings: 6,
      cost: 5.50,
      ingredients: [
        { productName: 'Vin rouge 75cl', quantity: 1, unit: 'bouteille' },
        { productName: "Jus d'orange 1L", quantity: 25, unit: 'cl' },
        { productName: 'Sirop de grenadine', quantity: 5, unit: 'cl' },
        { productName: 'Citron vert', quantity: 2, unit: 'pièces' },
      ],
    },
    {
      id: 4,
      name: 'Plateau apéro',
      category: 'Snacks',
      servings: 4,
      cost: 3.30,
      ingredients: [
        { productName: 'Chips nature 150g', quantity: 2, unit: 'sachets' },
        { productName: 'Coca-Cola 33cl', quantity: 4, unit: 'cannettes' },
        { productName: 'Eau minérale 50cl', quantity: 4, unit: 'bouteilles' },
      ],
    },
    {
      id: 5,
      name: 'Vodka Orange',
      category: 'Cocktails',
      servings: 1,
      cost: 1.40,
      ingredients: [
        { productName: 'Vodka 70cl', quantity: 4, unit: 'cl' },
        { productName: "Jus d'orange 1L", quantity: 10, unit: 'cl' },
      ],
    },
  ]);

  protected readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.products();
    return this.products().filter(
      p =>
        p.name.toLowerCase().includes(query) ||
        p.category.toLowerCase().includes(query) ||
        p.supplier.toLowerCase().includes(query)
    );
  });

  protected readonly filteredRecipes = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.recipes();
    return this.recipes().filter(
      r => r.name.toLowerCase().includes(query) || r.category.toLowerCase().includes(query)
    );
  });

  protected setTab(tab: 'produits' | 'recettes'): void {
    this.activeTab.set(tab);
    this.searchQuery.set('');
  }

  protected onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }

  protected formatPrice(price: number): string {
    return price.toFixed(2) + ' €';
  }

  protected readonly console = console;
  protected readonly LucidePlus = LucidePlus;
}
