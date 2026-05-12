import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { interval } from 'rxjs';
import { EventsService } from '#core/services/events/events-service';
import { OrdersService } from '#core/services/orders/orders-service';
import { ToastService } from '#shared/components/toast/toast.service';
import { Order } from '#core/models/order.model';
import { OrderCard } from './components/order-card/order-card';
import { KdsToolbar, KdsFilter } from './components/kds-toolbar/kds-toolbar';

function padTwo(n: number): string {
  return String(n).padStart(2, '0');
}

@Component({
  selector: 'bfd-kitchen',
  templateUrl: './kitchen.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, OrderCard, KdsToolbar],
})
export class Kitchen {
  private readonly eventsService = inject(EventsService);
  private readonly ordersService = inject(OrdersService);
  private readonly toastService = inject(ToastService);
  private readonly destroyRef = inject(DestroyRef);

  /** Ticks every second for the clock and elapsed-time displays. */
  private readonly tick = toSignal(
    interval(1000).pipe(takeUntilDestroyed(this.destroyRef)),
    { initialValue: 0 }
  );

  readonly event = this.eventsService.currentActiveEvent;

  readonly filter = signal<KdsFilter>('all');

  readonly clock = computed(() => {
    void this.tick();
    const now = new Date();
    return `${padTwo(now.getHours())}:${padTwo(now.getMinutes())}:${padTwo(now.getSeconds())}`;
  });

  readonly visibleOrders = computed(() => {
    const f = this.filter();
    const orders = this.ordersService.orders();
    if (f === 'all') return orders;
    return orders.filter(o => o.status === f);
  });

  formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  onAdvance(order: Order): void {
    this.ordersService.advanceStatus(order.id);
  }

  onCancel(order: Order): void {
    this.ordersService.cancel(order.id);
    this.toastService.show({
      type: 'info',
      title: 'Commande annulée',
      message: `La commande #${order.number} a été annulée.`,
    });
  }
}
