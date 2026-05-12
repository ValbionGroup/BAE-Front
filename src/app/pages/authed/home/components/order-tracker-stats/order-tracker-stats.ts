import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { OrdersService } from '#core/services/orders/orders-service';

@Component({
  selector: 'bfd-order-tracker-stats',
  templateUrl: './order-tracker-stats.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderTrackerStats {
  private readonly ordersService = inject(OrdersService);

  protected readonly activeCount = computed(
    () =>
      this.ordersService.pendingCount() +
      this.ordersService.inProgressCount() +
      this.ordersService.readyCount(),
  );
  protected readonly completedCount = this.ordersService.completedCount;
  protected readonly cancelledCount = this.ordersService.cancelledCount;
}
