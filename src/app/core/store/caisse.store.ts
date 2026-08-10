import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { EventsStore } from '#core/store/events.store';
import { EventsService } from '#core/services/events/events-service';
import { EventDetail, MenuItem } from '#core/models/event.model';
import { LoadingStatus } from '#core/models/global.model';

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
}

const initialState: CaisseState = {
  sessionEventId: null,
  cart: [],
  activeCategory: null,
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
        todayEvent: computed<EventDetail | null>(() => eventsService.currentActiveEvent()),
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
  withMethods((store) => ({
    startSession(eventId: string): void {
      patchState(store, { sessionEventId: eventId, cart: [], activeCategory: null });
    },
    endSession(): void {
      patchState(store, { sessionEventId: null, cart: [], activeCategory: null });
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
  })),
);
