import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { EventsStore } from '#core/store/events.store';
import { EventsService } from '#core/services/events/events-service';
import { EventDetail, MenuItem } from '#core/models/event.model';
import { LoadingStatus } from '#core/models/global.model';
import { OrdersStore } from '#core/store/orders.store';
import type { Buyer } from '#core/services/buyers/buyers-service';
import type { Order } from '#core/models/order.model';
import type { PaymentMethod } from '#shared/components/modal/payment-modal/payment-modal';

export interface CaisseCartItem {
  readonly productId: number;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
}

/**
 * Un article sans catégorie reste atteignable sous son propre onglet plutôt
 * que de disparaître de la grille : `products` n'a pas de catégorie propre, et
 * une recette sans ingrédient catégorisé est un cas normal, pas une anomalie.
 */
function categoryLabel(item: MenuItem): string {
  return item.category ?? 'Sans catégorie';
}

interface CaisseState {
  readonly sessionEventId: string | null;
  readonly cart: readonly CaisseCartItem[];
  readonly activeCategory: string | null;
  /** Acheteur désigné pour la prochaine commande ; `null` = anonyme. */
  readonly selectedBuyer: Buyer | null;
  readonly checkingOut: boolean;
  readonly checkoutError: string | null;
}

const initialState: CaisseState = {
  sessionEventId: null,
  cart: [],
  activeCategory: null,
  selectedBuyer: null,
  checkingOut: false,
  checkoutError: null,
};

export const CaisseStore = signalStore(
  { providedIn: 'root' },
  withState<CaisseState>(initialState),
  withComputed(
    (
      { sessionEventId, cart, activeCategory },
      eventsStore = inject(EventsStore),
      eventsService = inject(EventsService),
    ) => {
      const sessionEvent = computed<EventDetail | null>(() => {
        const id = sessionEventId();
        if (!id) return null;
        return eventsStore.events()[id] ?? null;
      });

      const menu = computed<readonly MenuItem[]>(() => sessionEvent()?.menu ?? []);

      const categories = computed<readonly string[]>(() => {
        const seen = new Set<string>();
        const ordered: string[] = [];
        for (const item of menu()) {
          const label = categoryLabel(item);
          if (!seen.has(label)) {
            seen.add(label);
            ordered.push(label);
          }
        }
        return ordered;
      });

      const visibleItems = computed<readonly MenuItem[]>(() => {
        const cat = activeCategory();
        const items = menu();
        if (!cat) return items;
        return items.filter((it) => categoryLabel(it) === cat);
      });

      const subtotal = computed(() =>
        cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
      );

      const totalQuantity = computed(() => cart().reduce((sum, line) => sum + line.quantity, 0));

      return {
        loading: computed<LoadingStatus>(() => eventsStore.loading()),
        /**
         * La soirée sur laquelle la caisse peut ouvrir : celle `ongoing`, ou à
         * défaut celle **datée d'aujourd'hui** — jamais une soirée future.
         *
         * Dérivée d'`EventsStore.activeEvent`, la même que pilote la vue live :
         * dès qu'une soirée est suivie en live, la caisse est ouvrable, et les
         * deux écrans ne peuvent pas désigner deux soirées différentes.
         *
         * ⚠️ Elle dérivait auparavant d'`EventsService.currentActiveEvent`, un
         * `computed(() => null)` inconditionnel — la caisse affichait donc
         * toujours « aucune soirée programmée » et ne pouvait pas s'ouvrir.
         */
        todayEvent: eventsStore.activeEvent,
        sessionEvent,
        sessionActive: computed(() => sessionEventId() !== null),
        menu,
        categories,
        visibleItems,
        subtotal,
        totalQuantity,
        itemCount: computed(() => cart().length),
      };
    },
  ),
  withMethods((store, eventsStore = inject(EventsStore), ordersStore = inject(OrdersStore)) => ({
    /**
     * Ouvre la caisse sur une soirée.
     *
     * Charge le menu au passage : `sessionEvent()?.menu` est ce que la grille
     * d'articles affiche, et rien d'autre ne le remplit — ouvrir sans lui
     * donnait une caisse vide, sans erreur nulle part.
     */
    startSession(eventId: string): void {
      patchState(store, { sessionEventId: eventId, cart: [], activeCategory: null });
      void eventsStore.loadEventMenu(eventId);
    },
    endSession(): void {
      patchState(store, {
        sessionEventId: null,
        cart: [],
        activeCategory: null,
        selectedBuyer: null,
        checkoutError: null,
      });
    },
    setBuyer(buyer: Buyer | null): void {
      patchState(store, { selectedBuyer: buyer });
    },
    setActiveCategory(category: string | null): void {
      patchState(store, { activeCategory: category });
    },
    addToCart(item: MenuItem): void {
      const existing = store.cart().find((line) => line.productId === item.productId);
      if (existing) {
        patchState(store, {
          cart: store
            .cart()
            .map((line) =>
              line.productId === item.productId ? { ...line, quantity: line.quantity + 1 } : line,
            ),
        });
        return;
      }
      patchState(store, {
        cart: [
          ...store.cart(),
          { productId: item.productId, name: item.name, price: item.price, quantity: 1 },
        ],
      });
    },
    incrementItem(productId: number): void {
      patchState(store, {
        cart: store
          .cart()
          .map((line) =>
            line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line,
          ),
      });
    },
    decrementItem(productId: number): void {
      patchState(store, {
        cart: store
          .cart()
          .map((line) =>
            line.productId === productId ? { ...line, quantity: line.quantity - 1 } : line,
          )
          .filter((line) => line.quantity > 0),
      });
    },
    removeFromCart(productId: number): void {
      patchState(store, {
        cart: store.cart().filter((line) => line.productId !== productId),
      });
    },
    clearCart(): void {
      patchState(store, { cart: [] });
    },

    /**
     * Encaisse le panier.
     *
     * ⚠️ Le panier n'est vidé **qu'en cas de succès** : il l'était auparavant
     * de façon inconditionnelle, si bien qu'une coupure réseau faisait perdre
     * la commande sans laisser de trace à l'écran.
     */
    async checkout(method: PaymentMethod = 'cash'): Promise<Order | null> {
      const eventId = store.sessionEventId();
      const lines = store.cart();
      if (!eventId || lines.length === 0) return null;

      patchState(store, { checkingOut: true, checkoutError: null });

      const order = await ordersStore.checkout(
        eventId,
        lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        store.selectedBuyer()?.userId ?? null,
        method,
      );

      if (order) {
        patchState(store, { cart: [], selectedBuyer: null, checkingOut: false });
      } else {
        patchState(store, {
          checkingOut: false,
          checkoutError: ordersStore.loadError() ?? 'L’encaissement a échoué.',
        });
      }

      return order;
    },
  })),
);
