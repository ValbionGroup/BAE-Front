import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { Order, OrderItem, OrderStatus, nextStatus } from '#core/models/order.model';
import { WsMessage } from '#core/models/ws-message.model';
import { WebsocketService } from '#core/services/websocket/websocket-service';
import { EventsService } from '#core/services/events/events-service';

function buildSeedOrders(eventId: string): Order[] {
  const now = Date.now();
  const items = (
    list: Array<{ recipeId: string; recipeName: string; quantity: number; notes?: string }>,
  ): OrderItem[] => list;

  return [
    {
      id: 'o1',
      number: 1,
      eventId,
      items: items([{ recipeId: 'r1', recipeName: 'Mojito', quantity: 2 }]),
      status: 'pending',
      createdAt: now - 120_000,
      updatedAt: now - 120_000,
    },
    {
      id: 'o2',
      number: 2,
      eventId,
      items: items([
        { recipeId: 'r6', recipeName: 'Merguez frites', quantity: 1 },
        { recipeId: 'r2', recipeName: 'Panaché', quantity: 1 },
      ]),
      status: 'in_progress',
      createdAt: now - 240_000,
      updatedAt: now - 60_000,
    },
    {
      id: 'o3',
      number: 3,
      eventId,
      items: items([
        {
          recipeId: 'r4',
          recipeName: 'Plateau apéro',
          quantity: 1,
          notes: 'Sans gluten si possible',
        },
      ]),
      status: 'ready',
      createdAt: now - 360_000,
      updatedAt: now - 30_000,
    },
    {
      id: 'o4',
      number: 4,
      eventId,
      items: items([{ recipeId: 'r3', recipeName: 'Sangria', quantity: 3 }]),
      status: 'pending',
      createdAt: now - 90_000,
      updatedAt: now - 90_000,
    },
    {
      id: 'o5',
      number: 5,
      eventId,
      items: items([
        { recipeId: 'r5', recipeName: 'Vodka Orange', quantity: 2 },
        { recipeId: 'r1', recipeName: 'Mojito', quantity: 1 },
      ]),
      status: 'completed',
      createdAt: now - 600_000,
      updatedAt: now - 300_000,
    },
    {
      id: 'o6',
      number: 6,
      eventId,
      items: items([{ recipeId: 'r6', recipeName: 'Merguez frites', quantity: 2 }]),
      status: 'pending',
      createdAt: now - 45_000,
      updatedAt: now - 45_000,
    },
  ];
}

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly wsService = inject(WebsocketService);
  private readonly eventsService = inject(EventsService);

  private readonly _allOrders = signal<Order[]>([]);

  readonly orders: Signal<Order[]> = computed(() => {
    const activeId = this.eventsService.currentActiveEvent()?.event.id;
    if (!activeId) return [];
    return this._allOrders().filter((o) => o.eventId === activeId);
  });

  readonly pendingCount: Signal<number> = computed(
    () => this.orders().filter((o) => o.status === 'pending').length,
  );
  readonly inProgressCount: Signal<number> = computed(
    () => this.orders().filter((o) => o.status === 'in_progress').length,
  );
  readonly readyCount: Signal<number> = computed(
    () => this.orders().filter((o) => o.status === 'ready').length,
  );
  readonly completedCount: Signal<number> = computed(
    () => this.orders().filter((o) => o.status === 'completed').length,
  );
  readonly cancelledCount: Signal<number> = computed(
    () => this.orders().filter((o) => o.status === 'cancelled').length,
  );

  constructor() {
    // Seed initial orders for the active event (e1 = today)
    this._allOrders.set(buildSeedOrders('e1'));

    // Subscribe to incoming WS messages
    this.wsService.messages$.subscribe((msg: WsMessage) => {
      this.applyWsMessage(msg);
    });
  }

  advanceStatus(orderId: string): void {
    this._allOrders.update((orders) =>
      orders.map((o) => {
        if (o.id !== orderId) return o;
        const next = nextStatus(o.status);
        if (!next) return o;
        const updated: Order = { ...o, status: next, updatedAt: Date.now() };
        this.wsService.publish({ type: 'order.updated', payload: updated });
        return updated;
      }),
    );
  }

  cancel(orderId: string): void {
    this._allOrders.update((orders) =>
      orders.map((o) => {
        if (o.id !== orderId) return o;
        const updated: Order = { ...o, status: 'cancelled' as OrderStatus, updatedAt: Date.now() };
        this.wsService.publish({ type: 'order.cancelled', payload: { id: orderId } });
        return updated;
      }),
    );
  }

  private applyWsMessage(msg: WsMessage): void {
    switch (msg.type) {
      case 'order.created':
        // Only add if not already present (idempotent)
        this._allOrders.update((orders) =>
          orders.some((o) => o.id === msg.payload.id) ? orders : [...orders, msg.payload],
        );
        break;
      case 'order.updated':
        this._allOrders.update((orders) =>
          orders.map((o) => (o.id === msg.payload.id ? msg.payload : o)),
        );
        break;
      case 'order.cancelled':
        this._allOrders.update((orders) =>
          orders.map((o) =>
            o.id === msg.payload.id
              ? { ...o, status: 'cancelled' as OrderStatus, updatedAt: Date.now() }
              : o,
          ),
        );
        break;
    }
  }
}
