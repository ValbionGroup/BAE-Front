import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import {
  LucideAlertTriangle,
  LucideCheckCircle,
  LucidePackage,
  LucidePlus,
  LucideSearch,
  LucideXCircle,
} from '@lucide/angular';

interface StockItem {
  id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  minThreshold: number;
}

@Component({
  selector: 'bfd-stock',
  imports: [
    LucideSearch,
    LucidePlus,
    LucideAlertTriangle,
    LucideCheckCircle,
    LucideXCircle,
    LucidePackage,
  ],
  templateUrl: './stock.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Stock {
  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<string>('all');

  protected readonly items = signal<StockItem[]>([
    { id: 1, name: 'Bière blonde 33cl', category: 'Bières', quantity: 120, unit: 'bouteilles', minThreshold: 48 },
    { id: 2, name: 'Bière brune 33cl', category: 'Bières', quantity: 18, unit: 'bouteilles', minThreshold: 24 },
    { id: 3, name: 'Coca-Cola 33cl', category: 'Softs', quantity: 72, unit: 'cannettes', minThreshold: 48 },
    { id: 4, name: 'Eau minérale 50cl', category: 'Softs', quantity: 0, unit: 'bouteilles', minThreshold: 24 },
    { id: 5, name: 'Vin rouge 75cl', category: 'Vins', quantity: 24, unit: 'bouteilles', minThreshold: 12 },
    { id: 6, name: 'Chips nature 150g', category: 'Snacks', quantity: 8, unit: 'sachets', minThreshold: 20 },
    { id: 7, name: "Jus d'orange 1L", category: 'Softs', quantity: 30, unit: 'briques', minThreshold: 12 },
    { id: 8, name: 'Rhum 70cl', category: 'Spiritueux', quantity: 5, unit: 'bouteilles', minThreshold: 3 },
    { id: 9, name: 'Vodka 70cl', category: 'Spiritueux', quantity: 4, unit: 'bouteilles', minThreshold: 3 },
    { id: 10, name: 'Sirop de grenadine', category: 'Sirops', quantity: 2, unit: 'bouteilles', minThreshold: 2 },
  ]);

  protected readonly categories = computed(() =>
    [...new Set(this.items().map(i => i.category))].sort()
  );

  protected readonly filteredItems = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const category = this.selectedCategory();
    return this.items().filter(item => {
      const matchesSearch =
        item.name.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query);
      const matchesCategory = category === 'all' || item.category === category;
      return matchesSearch && matchesCategory;
    });
  });

  protected readonly stats = computed(() => {
    const all = this.items();
    return {
      total: all.length,
      ok: all.filter(i => i.quantity >= i.minThreshold).length,
      low: all.filter(i => i.quantity > 0 && i.quantity < i.minThreshold).length,
      out: all.filter(i => i.quantity === 0).length,
    };
  });

  protected getStatus(item: StockItem): 'ok' | 'low' | 'out' {
    if (item.quantity === 0) return 'out';
    if (item.quantity < item.minThreshold) return 'low';
    return 'ok';
  }

  protected setCategory(cat: string): void {
    this.selectedCategory.set(cat);
  }

  protected onSearch(event: Event): void {
    this.searchQuery.set((event.target as HTMLInputElement).value);
  }
}