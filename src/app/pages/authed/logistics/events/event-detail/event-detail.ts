import { ChangeDetectionStrategy, Component, inject, input, output } from '@angular/core';
import { DatePipe, DOCUMENT } from '@angular/common';
import {
  LucideChefHat,
  LucideDownload,
  LucideEdit,
  LucidePlus,
  LucideShoppingCart,
  LucideStore,
  LucideTrash2,
} from '@lucide/angular';
import { Button } from '#shared/components/button/button';
import { EventDetail as EventDetailModel } from '../events.models';

@Component({
  selector: 'bfd-event-detail',
  imports: [
    Button,
    LucideChefHat,
    LucideDownload,
    LucideEdit,
    LucideShoppingCart,
    LucideStore,
    LucideTrash2,
  ],
  templateUrl: './event-detail.html',
  providers: [DatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EventDetail {
  event = input.required<EventDetailModel>();

  addRecipe = output<void>();
  editRecipe = output<number>();
  removeRecipe = output<number>();

  protected readonly LucidePlus = LucidePlus;
  protected readonly LucideDownload = LucideDownload;
  protected readonly onAddRecipeClick = () => this.addRecipe.emit();
  protected readonly onExportClick = () => this.exportShoppingList();

  private readonly datePipe = inject(DatePipe);
  private readonly document = inject(DOCUMENT);

  protected formatPrice(price: number): string {
    return price.toFixed(2) + ' €';
  }

  protected formatDate(date: string): string {
    return this.datePipe.transform(date, 'd MMMM yyyy', undefined, 'fr') ?? date;
  }

  private exportShoppingList(): void {
    const event = this.event();
    const rows: string[][] = [['Magasin', 'Produit', 'Quantité', 'Unité', 'Prix total']];
    for (const store of event.shoppingList.byStore) {
      for (const item of store.items) {
        rows.push([
          store.storeName,
          item.productName,
          String(item.quantity),
          item.unit,
          this.formatPrice(item.totalPrice),
        ]);
      }
    }
    const csv = rows
      .map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = this.document.createElement('a');
    a.href = url;
    a.download = `courses-${event.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
