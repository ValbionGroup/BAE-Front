import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  OrdersService,
  toOrder,
  type ApiSellableLine,
  type CheckoutLine,
  type OrderDiscount,
} from '#core/services/orders/orders-service';
import { PreOrdersService } from '#core/services/pre-orders/pre-orders-service';
import type { LoadingStatus } from '#core/models/global.model';
import type { Order, OrderStatus, PaymentMethod } from '#core/models/order.model';
import type { PreOrderTicket } from '#core/models/pre-order.model';
import { messageOf } from '@bae/ui';

interface OrdersState {
  loading: LoadingStatus;
  loadError: string | null;
  orders: Order[];
  /** Les précommandes de la soirée, **à part des commandes**. */
  preOrders: PreOrderTicket[];
  sellable: ApiSellableLine[];
  /** Soirée actuellement chargée, pour ne pas mélanger deux services. */
  eventId: string | null;
}

/** Les commandes d'un statut, la plus ancienne d'abord. */
function byOldest(orders: readonly Order[], status: OrderStatus): Order[] {
  return orders
    .filter((order) => order.status === status)
    .sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() || a.id - b.id,
    );
}

/**
 * Les précommandes d'un statut, la plus urgente d'abord.
 *
 * Le tri est celui de l'heure de retrait, pas de la date de commande : une
 * précommande passée hier pour 22 h n'est pas prioritaire sur une passée ce
 * matin pour 19 h. Sans heure, elle passe en tête — rien ne dit quand elle sera
 * réclamée, donc on la prépare.
 */
function byPickup(tickets: readonly PreOrderTicket[], status: OrderStatus): PreOrderTicket[] {
  return tickets
    .filter((ticket) => ticket.status === status)
    .sort((a, b) => {
      const left = a.pickupAt === null ? 0 : new Date(a.pickupAt).getTime();
      const right = b.pickupAt === null ? 0 : new Date(b.pickupAt).getTime();
      return left - right || a.id - b.id;
    });
}

const initial: OrdersState = {
  loading: 'init',
  loadError: null,
  orders: [],
  preOrders: [],
  sellable: [],
  eventId: null,
};

export const OrdersStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withComputed((store) => ({
    pending: computed(() => byOldest(store.orders(), 'pending')),
    inProgress: computed(() => byOldest(store.orders(), 'in_progress')),
    ready: computed(() => byOldest(store.orders(), 'ready')),

    pendingPreOrders: computed(() =>
      byPickup(store.preOrders(), 'pending').filter((ticket) => ticket.due),
    ),

    inProgressPreOrders: computed(() => byPickup(store.preOrders(), 'in_progress')),
    readyPreOrders: computed(() => byPickup(store.preOrders(), 'ready')),

    activeCount: computed(
      () =>
        store.orders().filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length,
    ),
    completedCount: computed(() => store.orders().filter((o) => o.status === 'completed').length),
  })),
  withMethods((store) => {
    const svc = inject(OrdersService);
    const preOrdersSvc = inject(PreOrdersService);

    async function load(eventId: string): Promise<void> {
      if (store.loading() === 'loading') return;
      patchState(store, {
        loading: store.eventId() === eventId ? 'refreshing' : 'loading',
        eventId,
        loadError: null,
      });

      try {
        const [orders, sellable] = await Promise.all([
          lastValueFrom(svc.list(eventId)),
          lastValueFrom(svc.sellable(eventId)),
        ]);
        patchState(store, {
          orders: orders.map(toOrder),
          sellable,
          loading: 'loaded',
        });

        try {
          patchState(store, { preOrders: await lastValueFrom(preOrdersSvc.list(eventId)) });
        } catch {
          patchState(store, { preOrders: [] });
        }
      } catch (error: unknown) {
        patchState(store, {
          loading: 'error',
          loadError: messageOf(error, 'Les commandes n’ont pas pu être chargées.'),
        });
      }
    }

    function upsert(order: Order): void {
      patchState(store, (state) => {
        const known = state.orders.some((o) => o.id === order.id);
        return {
          orders: known
            ? state.orders.map((o) => (o.id === order.id ? order : o))
            : [order, ...state.orders],
        };
      });
    }

    function upsertPreOrder(ticket: PreOrderTicket): void {
      patchState(store, (state) => {
        const known = state.preOrders.some((p) => p.id === ticket.id);
        return {
          preOrders: known
            ? state.preOrders.map((p) => (p.id === ticket.id ? ticket : p))
            : [...state.preOrders, ticket],
        };
      });
    }

    return {
      load,
      upsert,
      upsertPreOrder,
      async refreshSellable(eventId: string): Promise<void> {
        try {
          patchState(store, { sellable: await lastValueFrom(svc.sellable(eventId)) });
        } catch {
          /* on garde les derniers chiffres connus */
        }
      },

      async advancePreOrder(preOrderId: number, next: OrderStatus): Promise<boolean> {
        try {
          upsertPreOrder(await lastValueFrom(preOrdersSvc.setStatus(preOrderId, next)));
          return true;
        } catch (error: unknown) {
          patchState(store, {
            loadError: messageOf(error, 'Ce changement de statut a été refusé.'),
          });
          return false;
        }
      },

      /** Remise au client — le seul geste qui clôt une précommande. */
      async collectPreOrder(preOrderId: number): Promise<boolean> {
        try {
          upsertPreOrder(await lastValueFrom(preOrdersSvc.collect(preOrderId)));
          return true;
        } catch (error: unknown) {
          patchState(store, {
            loadError: messageOf(error, 'Cette précommande n’a pas pu être remise.'),
          });
          return false;
        }
      },

      async advance(orderId: number, next: OrderStatus): Promise<boolean> {
        try {
          upsert(toOrder(await lastValueFrom(svc.setStatus(orderId, next))));
          return true;
        } catch (error: unknown) {
          patchState(store, {
            loadError: messageOf(error, 'Ce changement de statut a été refusé.'),
          });
          return false;
        }
      },

      async cancel(orderId: number): Promise<boolean> {
        try {
          upsert(toOrder(await lastValueFrom(svc.cancel(orderId))));
          return true;
        } catch (error: unknown) {
          patchState(store, {
            loadError: messageOf(error, 'Cette commande n’a pas pu être annulée.'),
          });
          return false;
        }
      },

      async checkout(
        eventId: string,
        lines: readonly CheckoutLine[],
        clientId?: number | null,
        paymentMethod: PaymentMethod = 'cash',
        sponsorshipCategoryId?: number | null,
        discount?: OrderDiscount | null,
        paymentData?: string,
      ): Promise<Order | null> {
        try {
          const order = toOrder(
            await lastValueFrom(
              svc.checkout(
                eventId,
                lines,
                clientId,
                paymentMethod,
                sponsorshipCategoryId,
                discount,
                paymentData,
              ),
            ),
          );
          upsert(order);
          return order;
        } catch (error: unknown) {
          patchState(store, {
            loadError: messageOf(error, 'L’encaissement a échoué.'),
          });
          return null;
        }
      },

      clearError(): void {
        patchState(store, { loadError: null });
      },
    };
  }),
);
