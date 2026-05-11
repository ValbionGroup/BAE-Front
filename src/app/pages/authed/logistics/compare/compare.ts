import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { LucideSearch, LucideStore, LucideTrendingDown } from '@lucide/angular';

interface Supplier {
  id: number;
  name: string;
}

interface ProductPrice {
  supplierId: number;
  price: number | null;
}

interface ComparableProduct {
  id: number;
  name: string;
  category: string;
  unit: string;
  prices: ProductPrice[];
}

@Component({
  selector: 'bfd-compare',
  imports: [LucideSearch, LucideStore, LucideTrendingDown],
  templateUrl: './compare.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Compare {
  protected readonly searchQuery = signal('');

  protected readonly suppliers = signal<Supplier[]>([
    { id: 1, name: 'Lidl' },
    { id: 2, name: 'Auchan' },
    { id: 3, name: 'Carrefour' },
    { id: 4, name: 'Costco' },
  ]);

  protected readonly products = signal<ComparableProduct[]>([
    {
      id: 1,
      name: 'Bière blonde 33cl',
      category: 'Bières',
      unit: 'bouteille',
      prices: [
        { supplierId: 1, price: 0.65 },
        { supplierId: 2, price: 0.72 },
        { supplierId: 3, price: 0.69 },
        { supplierId: 4, price: 0.58 },
      ],
    },
    {
      id: 2,
      name: 'Coca-Cola 33cl',
      category: 'Softs',
      unit: 'cannette',
      prices: [
        { supplierId: 1, price: 0.52 },
        { supplierId: 2, price: 0.48 },
        { supplierId: 3, price: 0.55 },
        { supplierId: 4, price: 0.45 },
      ],
    },
    {
      id: 3,
      name: 'Eau minérale 50cl',
      category: 'Softs',
      unit: 'bouteille',
      prices: [
        { supplierId: 1, price: 0.19 },
        { supplierId: 2, price: 0.22 },
        { supplierId: 3, price: 0.2 },
        { supplierId: 4, price: null },
      ],
    },
    {
      id: 4,
      name: 'Chips nature 150g',
      category: 'Snacks',
      unit: 'sachet',
      prices: [
        { supplierId: 1, price: 0.89 },
        { supplierId: 2, price: 1.05 },
        { supplierId: 3, price: 0.95 },
        { supplierId: 4, price: 0.75 },
      ],
    },
    {
      id: 5,
      name: 'Vin rouge 75cl',
      category: 'Vins',
      unit: 'bouteille',
      prices: [
        { supplierId: 1, price: 3.49 },
        { supplierId: 2, price: 4.2 },
        { supplierId: 3, price: 3.89 },
        { supplierId: 4, price: null },
      ],
    },
    {
      id: 6,
      name: "Jus d'orange 1L",
      category: 'Softs',
      unit: 'brique',
      prices: [
        { supplierId: 1, price: 1.09 },
        { supplierId: 2, price: 1.25 },
        { supplierId: 3, price: 1.15 },
        { supplierId: 4, price: 0.99 },
      ],
    },
    {
      id: 7,
      name: 'Rhum 70cl',
      category: 'Spiritueux',
      unit: 'bouteille',
      prices: [
        { supplierId: 1, price: 9.9 },
        { supplierId: 2, price: 8.9 },
        { supplierId: 3, price: 10.5 },
        { supplierId: 4, price: null },
      ],
    },
  ]);

  protected readonly filteredProducts = computed(() => {
    const query = this.searchQuery().toLowerCase();
    if (!query) return this.products();
    return this.products().filter(
      (p) => p.name.toLowerCase().includes(query) || p.category.toLowerCase().includes(query),
    );
  });

  protected getPrice(product: ComparableProduct, supplierId: number): number | null {
    return product.prices.find((p) => p.supplierId === supplierId)?.price ?? null;
  }

  protected isMinPrice(product: ComparableProduct, supplierId: number): boolean {
    const validPrices = product.prices
      .filter((p) => p.price !== null)
      .map((p) => p.price as number);
    if (validPrices.length === 0) return false;
    const price = this.getPrice(product, supplierId);
    return price !== null && price === Math.min(...validPrices);
  }

  protected getSavings(product: ComparableProduct): number | null {
    const validPrices = product.prices
      .filter((p) => p.price !== null)
      .map((p) => p.price as number);
    if (validPrices.length < 2) return null;
    const savings = Math.max(...validPrices) - Math.min(...validPrices);
    return savings > 0 ? savings : null;
  }

  protected formatPrice(price: number): string {
    return price.toFixed(2) + ' €';
  }

  protected onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}
