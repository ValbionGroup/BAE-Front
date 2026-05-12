import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { Pills, PillElement } from '#shared/components/pills/pills';
import { OrdersService } from '#core/services/orders/orders-service';

export type KdsFilter =
  | 'all'
  | 'pending'
  | 'in_progress'
  | 'ready'
  | 'completed'
  | 'cancelled';

@Component({
  selector: 'bfd-kds-toolbar',
  templateUrl: './kds-toolbar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Pills],
})
export class KdsToolbar {
  private readonly ordersService = inject(OrdersService);

  readonly filter = input<KdsFilter>('all');
  readonly filterChange = output<KdsFilter>();

  readonly pills = computed<PillElement[]>(() => [
    {
      key: 'pending',
      label: `En attente (${this.ordersService.pendingCount()})`,
    },
    {
      key: 'in_progress',
      label: `En préparation (${this.ordersService.inProgressCount()})`,
    },
    {
      key: 'ready',
      label: `Prêt (${this.ordersService.readyCount()})`,
    },
    {
      key: 'completed',
      label: `Terminé (${this.ordersService.completedCount()})`,
    },
    {
      key: 'cancelled',
      label: `Annulé (${this.ordersService.cancelledCount()})`,
    },
  ]);

  onPillClick(key: string): void {
    this.filterChange.emit(key as KdsFilter);
  }
}
