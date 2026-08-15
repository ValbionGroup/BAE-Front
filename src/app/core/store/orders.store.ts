import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import {
  OrdersService,
  toOrder,
  type ApiSellableLine,
  type CheckoutLine,
} from '#core/services/orders/orders-service';
import type { LoadingStatus } from '#core/models/global.model';
import type { Order, OrderStatus } from '#core/models/order.model';
import { messageOf } from '#shared/utils/api-error';

interface OrdersState {
  loading: LoadingStatus;
  loadError: string | null;
  orders: Order[];
  sellable: ApiSellableLine[];
  /** Soirée actuellement chargée, pour ne pas mélanger deux services. */
  eventId: string | null;
}

const initial: OrdersState = {
  loading: 'init',
  loadError: null,
  orders: [],
  sellable: [],
  eventId: null,
};

export const OrdersStore = signalStore(
  { providedIn: 'root' },
  withState(initial),
  withComputed((store) => ({
    pending: computed(() => store.orders().filter((o) => o.status === 'pending')),
    inProgress: computed(() => store.orders().filter((o) => o.status === 'in_progress')),
    ready: computed(() => store.orders().filter((o) => o.status === 'ready')),
    /** Ce que la cuisine a en charge — les trois colonnes non terminales. */
    activeCount: computed(
      () =>
        store.orders().filter((o) => o.status !== 'completed' && o.status !== 'cancelled').length,
    ),
    completedCount: computed(() => store.orders().filter((o) => o.status === 'completed').length),
  })),
  withMethods((store) => {
    const svc = inject(OrdersService);

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
      } catch (error: unknown) {
        patchState(store, {
          loading: 'error',
          loadError: messageOf(error, 'Les commandes n’ont pas pu être chargées.'),
        });
      }
    }

    /**
     * Insère ou remplace une commande — le même chemin sert au retour d'un appel
     * et à un message poussé par le serveur, de sorte qu'un aller-retour local
     * et une diffusion ne puissent pas produire deux états différents.
     */
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

    return {
      load,
      upsert,

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
      ): Promise<Order | null> {
        try {
          const order = toOrder(await lastValueFrom(svc.checkout(eventId, lines, clientId)));
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
