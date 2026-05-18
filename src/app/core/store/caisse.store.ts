import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { EventsStore } from '#core/store/events.store';
import { EventsService } from '#core/services/events/events-service';
import { EventDetail, MenuItem } from '#core/models/event.model';
import { LoadingStatus } from '#core/models/global.model';

export interface CaisseCartItem {
  readonly recipeId: string;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
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
          if (!seen.has(item.category)) {
            seen.add(item.category);
            ordered.push(item.category);
          }
        }
        return ordered;
      });

      const visibleItems = computed<readonly MenuItem[]>(() => {
        const cat = activeCategory();
        const items = menu();
        if (!cat) return items;
        return items.filter((it) => it.category === cat);
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
      const existing = store.cart().find((line) => line.recipeId === item.recipeId);
      if (existing) {
        patchState(store, {
          cart: store
            .cart()
            .map((line) =>
              line.recipeId === item.recipeId ? { ...line, quantity: line.quantity + 1 } : line,
            ),
        });
        return;
      }
      patchState(store, {
        cart: [
          ...store.cart(),
          { recipeId: item.recipeId, name: item.recipeName, price: item.price, quantity: 1 },
        ],
      });
    },
    incrementItem(recipeId: string): void {
      patchState(store, {
        cart: store
          .cart()
          .map((line) =>
            line.recipeId === recipeId ? { ...line, quantity: line.quantity + 1 } : line,
          ),
      });
    },
    decrementItem(recipeId: string): void {
      patchState(store, {
        cart: store
          .cart()
          .map((line) =>
            line.recipeId === recipeId ? { ...line, quantity: line.quantity - 1 } : line,
          )
          .filter((line) => line.quantity > 0),
      });
    },
    removeFromCart(recipeId: string): void {
      patchState(store, {
        cart: store.cart().filter((line) => line.recipeId !== recipeId),
      });
    },
    clearCart(): void {
      patchState(store, { cart: [] });
    },
  })),
);
