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
import type { PaymentMethod } from '#shared/components/modal/payment-modal/payment-modal';

export interface CaisseCartItem {
  readonly productId: number;
  readonly name: string;
  /**
   * ⚠️ Toujours le **prix public**, jamais le prix de catégorie. Y figer un
   * tarif préférentiel laisserait les lignes ajoutées avant le scan au prix
   * public et les suivantes au tarif — le prix effectif est dérivé.
   */
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
}

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

      /**
       * Le vendable restant, par recette, tel que la grille l'affiche.
       *
       * Vient d'`OrdersStore.sellable` : la caisse ne refait pas le calcul, elle
       * lit celui du serveur. Une recette absente de la carte n'a pas d'entrée —
       * `stockOf` rend alors `unknown`, qui ne bloque rien.
       */
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

      /**
       * La ligne que `+` / `−` ajustent, repliée sur la dernière du panier :
       * juste après un encaissement l'actif est nul, et le raccourci doit
       * quand même mordre sur quelque chose.
       */
      const activeLine = computed<CaisseCartItem | null>(() => {
        const lines = cart();
        const id = activeProductId();
        return lines.find((line) => line.productId === id) ?? lines.at(-1) ?? null;
      });

      const unitPriceOf = (line: CaisseCartItem): number =>
        category()?.priceByProduct.get(line.productId) ?? line.price;

      /** Ce que le comptoir encaisse maintenant. */
      const chargedTotal = computed(() =>
        cart().reduce((sum, line) => sum + unitPriceOf(line) * line.quantity, 0),
      );

      /** La valeur au prix public — ce que le BAE touchera au total. */
      const publicTotal = computed(() =>
        cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
      );

      const receivableTotal = computed(() => publicTotal() - chargedTotal());

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
  withMethods((store, eventsStore = inject(EventsStore), ordersStore = inject(OrdersStore)) => {
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

    return {
      canAdd,
      unitPriceOf,

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
        // Le vendable vient d'ici : sans ce chargement, la grille ne saurait pas
        // ce qui est en rupture et laisserait vendre du vide.
        void ordersStore.load(eventId);
      },
      endSession(): void {
        patchState(store, {
          sessionEventId: null,
          cart: [],
          activeCategory: null,
          selectedBuyer: null,
          // Le store est `providedIn: 'root'` : sans ça, une catégorie fuiterait
          // d'une session — et d'un test — à la suivante.
          category: null,
          checkoutError: null,
          activeProductId: null,
        });
      },
      /** Referme la confirmation (ou le refus) affichée après un encaissement. */
      dismissFeedback(): void {
        patchState(store, { lastOrder: null, checkoutError: null, errorTitle: null });
      },
      setBuyer(buyer: Buyer | null): void {
        patchState(store, { selectedBuyer: buyer });
      },
      /**
       * Le serveur revérifie, mais refuser ici évite d'afficher des prix qui
       * seront rejetés à l'encaissement.
       *
       * ⚠️ Comparaison **numérique** : `EventApiDto.id` est typé `string` alors
       * que l'API renvoie un nombre, donc `sessionEventId` porte un nombre à
       * l'exécution. Comparer les chaînes refusait tous les QR valides.
       */
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
      /**
       * Ce que le panier peut encore prendre de cette recette.
       *
       * `null` quand rien ne le limite — soit la production n'est pas suivie, soit
       * il reste de la marge. Ne jamais rendre `0` dans ce cas : ce serait
       * confondre « on ne sait pas » avec « il n'y en a plus ».
       */
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
                line.productId === item.productId ? { ...line, quantity: line.quantity + 1 } : line,
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

        // Descendre à zéro retire la ligne : l'actif se reporte sur la
        // dernière restante, sinon `−` viserait une ligne disparue.
        patchState(store, { cart, ...activeAfter(cart, productId) });
      },
      removeFromCart(productId: number): void {
        const cart = store.cart().filter((line) => line.productId !== productId);
        patchState(store, { cart, ...activeAfter(cart, productId) });
      },
      clearCart(): void {
        patchState(store, { cart: [], activeProductId: null });
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
            // Le QR est rescanné à chaque commande : la catégorie ne survit pas
            // au ticket. Elle survit en revanche à un échec, comme le panier.
            category: null,
            checkingOut: false,
            lastOrder: order,
          });
          // Le vendable vient de bouger. Relu, pas décrémenté ici : le serveur
          // exclut les commandes annulées et reste seul juge de ce qui reste.
          // Volontairement non attendu — la confirmation ne doit pas patienter.
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
  }),
);
