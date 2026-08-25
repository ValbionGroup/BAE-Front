import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { EventsStore } from '#core/store/events.store';
import { EventsService } from '#core/services/events/events-service';
import { EventDetail, MenuItem } from '#core/models/event.model';
import { LoadingStatus } from '#core/models/global.model';
import { OrdersStore } from '#core/store/orders.store';
import { blocksSale, stockLevelOf, type StockLevel } from '#shared/utils/stock-level';
import type { Buyer } from '#core/services/buyers/buyers-service';
import type { ScannedCategory } from '#core/services/buyers/buyers-service';
import type { Order } from '#core/models/order.model';
import type { PaymentMethod } from '#core/models/order.model';
import { CardPaymentsService } from '#core/services/payments/card-payments-service';
import type { CardPaymentStatus } from '#core/services/payments/card-payments-service';
import { lastValueFrom } from 'rxjs';
import { messageOf } from '@bae/ui';

export interface CaisseCartItem {
  readonly productId: number;
  readonly name: string;
  readonly price: number;
  readonly quantity: number;
}

export interface AppliedCategory {
  readonly id: number;
  readonly label: string;
  readonly eventId: string;
  readonly payerName: string | null;
  readonly priceByProduct: ReadonlyMap<number, number>;
}

/**
 * Un article sans catégorie reste atteignable sous son propre onglet plutôt
 * que de disparaître de la grille : `products` n'a pas de catégorie propre, et
 * une recette sans ingrédient catégorisé est un cas normal, pas une anomalie.
 */
function activeAfter(
  cart: readonly CaisseCartItem[],
  touched: number,
): { activeProductId: number | null } {
  if (cart.some((line) => line.productId === touched)) return { activeProductId: touched };
  return { activeProductId: cart.at(-1)?.productId ?? null };
}

function categoryLabel(item: MenuItem): string {
  return item.category ?? 'Sans catégorie';
}

interface CaisseState {
  readonly sessionEventId: string | null;
  readonly cart: readonly CaisseCartItem[];
  readonly activeCategory: string | null;
  /** Acheteur désigné pour la prochaine commande ; `null` = anonyme. */
  readonly selectedBuyer: Buyer | null;
  /** Catégorie de prise en charge appliquée à la commande en cours. */
  readonly category: AppliedCategory | null;
  readonly checkingOut: boolean;
  readonly checkoutError: string | null;
  /** Titre du bandeau de refus ; `null` = « Encaissement refusé ». */
  readonly errorTitle: string | null;
  /** Dernière commande encaissée — alimente la confirmation à l'écran. */
  readonly lastOrder: Order | null;
  /** Ligne du panier que `+` / `−` ajustent. */
  readonly activeProductId: number | null;
  /** Le paiement par carte en cours. */
  readonly cardPayment: { readonly orderRef: string; readonly amountCents: number } | null;
}

const clearedSession = {
  cart: [],
  activeCategory: null,
  selectedBuyer: null,
  category: null,
  checkoutError: null,
  activeProductId: null,
  cardPayment: null,
} satisfies Partial<CaisseState>;

const initialState: CaisseState = {
  sessionEventId: null,
  cart: [],
  activeCategory: null,
  selectedBuyer: null,
  category: null,
  checkingOut: false,
  checkoutError: null,
  errorTitle: null,
  lastOrder: null,
  activeProductId: null,
  cardPayment: null,
};

export const CaisseStore = signalStore(
  { providedIn: 'root' },
  withState<CaisseState>(initialState),
  withComputed(
    (
      { sessionEventId, cart, activeCategory, activeProductId, category },
      eventsStore = inject(EventsStore),
      eventsService = inject(EventsService),
      ordersStore = inject(OrdersStore),
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

      const stockByProduct = computed(() => {
        const byId = new Map<number, { level: StockLevel; remainingQty: number }>();
        for (const line of ordersStore.sellable()) {
          byId.set(line.productId, {
            level: stockLevelOf(line.remainingQty, line.producedQty),
            remainingQty: line.remainingQty,
          });
        }
        return byId;
      });

      const activeLine = computed<CaisseCartItem | null>(() => {
        const lines = cart();
        const id = activeProductId();
        return lines.find((line) => line.productId === id) ?? lines.at(-1) ?? null;
      });

      const unitPriceOf = (line: CaisseCartItem): number =>
        category()?.priceByProduct.get(line.productId) ?? line.price;

      const chargedTotal = computed(() =>
        cart().reduce((sum, line) => sum + unitPriceOf(line) * line.quantity, 0),
      );

      const publicTotal = computed(() =>
        cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
      );

      const receivableTotal = computed(() => publicTotal() - chargedTotal());

      const totalQuantity = computed(() => cart().reduce((sum, line) => sum + line.quantity, 0));

      return {
        loading: computed<LoadingStatus>(() => eventsStore.loading()),
        todayEvent: eventsStore.activeEvent,
        sessionEvent,
        sessionActive: computed(() => sessionEventId() !== null),
        menu,
        categories,
        visibleItems,
        activeLine,
        stockByProduct,
        chargedTotal,
        publicTotal,
        receivableTotal,
        totalQuantity,
        itemCount: computed(() => cart().length),
      };
    },
  ),
  withMethods(
    (
      store,
      eventsStore = inject(EventsStore),
      ordersStore = inject(OrdersStore),
      cardPayments = inject(CardPaymentsService),
    ) => {
      const inCart = (productId: number) =>
        store.cart().find((line) => line.productId === productId)?.quantity ?? 0;

      /** La grille grise le bouton, mais le store refuse aussi : le clavier existe. */
      function canAdd(productId: number): boolean {
        const stock = store.stockByProduct().get(productId);
        if (!stock) return true;
        if (blocksSale(stock.level)) return false;
        if (stock.level === 'unknown') return true;
        return inCart(productId) < stock.remainingQty;
      }

      /** Le prix effectif est dérivé : appliquer une catégorie retarife tout le panier. */
      function unitPriceOf(line: CaisseCartItem): number {
        return store.category()?.priceByProduct.get(line.productId) ?? line.price;
      }

      function settled(order: Order) {
        return {
          cart: [],
          selectedBuyer: null,
          category: null,
          checkingOut: false,
          cardPayment: null,
          lastOrder: order,
        } satisfies Partial<CaisseState>;
      }

      async function startCardPayment(): Promise<Order | null> {
        const eventId = store.sessionEventId();
        const lines = store.cart();
        if (!eventId || lines.length === 0) return null;

        patchState(store, { checkingOut: true, checkoutError: null, errorTitle: null });

        try {
          const payment = await lastValueFrom(
            cardPayments.open(
              eventId,
              lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
              store.selectedBuyer()?.userId ?? null,
              store.category()?.id ?? null,
            ),
          );

          patchState(store, {
            cardPayment: { orderRef: payment.orderRef, amountCents: payment.amountCents },
          });
        } catch (error) {
          patchState(store, {
            checkingOut: false,
            cardPayment: null,
            checkoutError: messageOf(error, 'Le paiement par carte n’a pas pu démarrer.'),
            errorTitle: 'Terminal indisponible',
          });
        }

        return null;
      }

      return {
        canAdd,
        unitPriceOf,

        startSession(eventId: string): void {
          patchState(store, { ...clearedSession, sessionEventId: eventId });
          void eventsStore.loadEventMenu(eventId);
          void ordersStore.load(eventId);
        },
        endSession(): void {
          patchState(store, { ...clearedSession, sessionEventId: null });
        },
        dismissFeedback(): void {
          patchState(store, { lastOrder: null, checkoutError: null, errorTitle: null });
        },
        setBuyer(buyer: Buyer | null): void {
          patchState(store, { selectedBuyer: buyer });
        },
        applyCategory(scanned: ScannedCategory): boolean {
          if (Number(scanned.eventId) !== Number(store.sessionEventId())) {
            patchState(store, {
              checkoutError: 'Ce QR appartient à une autre soirée.',
              errorTitle: 'QR refusé',
            });
            return false;
          }

          patchState(store, {
            checkoutError: null,
            errorTitle: null,
            category: {
              id: scanned.id,
              label: scanned.label,
              eventId: String(scanned.eventId),
              payerName: scanned.payerName,
              priceByProduct: new Map(scanned.prices.map((p) => [p.productId, p.priceCents])),
            },
          });
          return true;
        },
        clearCategory(): void {
          patchState(store, { category: null });
        },
        setActiveCategory(category: string | null): void {
          patchState(store, { activeCategory: category });
        },
        focusLine(productId: number): void {
          patchState(store, { activeProductId: productId });
        },

        /** `F1` : fait défiler les onglets, « Tous » compris. */
        nextCategory(): void {
          const categories = store.categories();
          if (categories.length === 0) return;

          const index = categories.indexOf(store.activeCategory() ?? '');
          patchState(store, { activeCategory: categories[index + 1] ?? null });
        },
        remainingFor(productId: number): number | null {
          const stock = store.stockByProduct().get(productId);
          if (!stock || stock.level === 'unknown') return null;
          return Math.max(0, stock.remainingQty - inCart(productId));
        },

        addToCart(item: MenuItem): void {
          if (!canAdd(item.productId)) return;

          const existing = store.cart().find((line) => line.productId === item.productId);
          if (existing) {
            patchState(store, {
              cart: store
                .cart()
                .map((line) =>
                  line.productId === item.productId
                    ? { ...line, quantity: line.quantity + 1 }
                    : line,
                ),
              activeProductId: item.productId,
            });
            return;
          }
          patchState(store, {
            cart: [
              ...store.cart(),
              { productId: item.productId, name: item.name, price: item.price, quantity: 1 },
            ],
            activeProductId: item.productId,
          });
        },
        incrementItem(productId: number): void {
          if (!canAdd(productId)) return;
          patchState(store, {
            cart: store
              .cart()
              .map((line) =>
                line.productId === productId ? { ...line, quantity: line.quantity + 1 } : line,
              ),
            activeProductId: productId,
          });
        },
        decrementItem(productId: number): void {
          const cart = store
            .cart()
            .map((line) =>
              line.productId === productId ? { ...line, quantity: line.quantity - 1 } : line,
            )
            .filter((line) => line.quantity > 0);

          patchState(store, { cart, ...activeAfter(cart, productId) });
        },
        removeFromCart(productId: number): void {
          const cart = store.cart().filter((line) => line.productId !== productId);
          patchState(store, { cart, ...activeAfter(cart, productId) });
        },
        clearCart(): void {
          patchState(store, { cart: [], activeProductId: null });
        },
        startCardPayment,
        settleCardPayment(orderRef: string, status: CardPaymentStatus, order: Order | null): void {
          if (store.cardPayment()?.orderRef !== orderRef) return;

          if (status === 'paid' && order) {
            patchState(store, settled(order));
            const eventId = store.sessionEventId();
            if (eventId) void ordersStore.refreshSellable(eventId);
            return;
          }

          patchState(store, {
            checkingOut: false,
            cardPayment: null,
            checkoutError:
              status === 'cancelled'
                ? 'Le paiement a été annulé sur le terminal.'
                : status === 'expired'
                  ? 'Le paiement a expiré : la carte n’a pas été présentée à temps.'
                  : 'La carte a été refusée.',
            errorTitle: 'Paiement par carte refusé',
          });
        },

        async cancelCardPayment(): Promise<void> {
          const pending = store.cardPayment();
          if (!pending) return;

          try {
            await lastValueFrom(cardPayments.cancel(pending.orderRef));
          } finally {
            patchState(store, { checkingOut: false, cardPayment: null });
          }
        },

        async refreshCardPayment(): Promise<void> {
          const pending = store.cardPayment();
          if (!pending) return;

          const payment = await lastValueFrom(cardPayments.refresh(pending.orderRef));
          if (payment.status !== 'pending') {
            patchState(store, { checkingOut: false });
          }
        },

        async checkout(method: PaymentMethod = 'cash'): Promise<Order | null> {
          if (method === 'card') return startCardPayment();

          const eventId = store.sessionEventId();
          const lines = store.cart();
          if (!eventId || lines.length === 0) return null;

          patchState(store, { checkingOut: true, checkoutError: null, errorTitle: null });

          const order = await ordersStore.checkout(
            eventId,
            lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
            store.selectedBuyer()?.userId ?? null,
            method,
            store.category()?.id ?? null,
          );

          if (order) {
            patchState(store, {
              cart: [],
              selectedBuyer: null,
              category: null,
              checkingOut: false,
              lastOrder: order,
            });
            void ordersStore.refreshSellable(eventId);
          } else {
            patchState(store, {
              checkingOut: false,
              checkoutError: ordersStore.loadError() ?? 'L’encaissement a échoué.',
              errorTitle: null,
            });
          }

          return order;
        },
      };
    },
  ),
);
