import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { CaisseStore } from './caisse.store';
import type { Order } from '#core/models/order.model';
import type { MenuItem } from '#core/models/event.model';

const HOTDOG: MenuItem = {
  productId: 7,
  name: 'Hot-dog',
  price: 250,
  category: 'Salé',
} as MenuItem;

function orderFor(eventId: string): Order {
  return {
    id: 42,
    number: 1,
    eventId,
    status: 'pending',
    clientName: 'Anonyme',
    lines: [{ productId: 7, productName: 'Hot-dog', quantity: 2, unitPrice: 250 }],
    totalCents: 500,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe(CaisseStore.name, () => {
  let store: InstanceType<typeof CaisseStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CaisseStore);
    http = TestBed.inject(HttpTestingController);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  /**
   * Le paiement par carte n'écrit aucune commande à l'ouverture : la vente
   * n'existe que dans le panier tant que le terminal n'a pas répondu. Ces tests
   * gardent ce qui doit survivre — et ce qui doit disparaître — à chaque issue.
   */
  describe('paiement par carte', () => {
    async function openCard(orderRef = 'ref-1'): Promise<void> {
      store.startSession('3');
      store.addToCart(HOTDOG);
      store.addToCart(HOTDOG);

      const pending = store.startCardPayment();

      const request = http.expectOne((req) => req.url.endsWith('/events/3/card-payments'));
      request.flush({ orderRef, status: 'pending', amountCents: 500, eventId: 3 });

      await pending;
    }

    it('garde le panier tant que le terminal n’a pas répondu', async () => {
      await openCard();

      expect(store.cart().length).toBe(1);
      expect(store.cart()[0].quantity).toBe(2);
      expect(store.cardPayment()?.orderRef).toBe('ref-1');
      expect(store.lastOrder()).toBeNull();
    });

    it('ignore une issue qui porte une autre référence', async () => {
      await openCard('ref-1');

      store.settleCardPayment('ref-autre', 'paid', orderFor('3'));

      expect(store.cardPayment()?.orderRef).toBe('ref-1');
      expect(store.cart().length).toBe(1);
      expect(store.lastOrder()).toBeNull();
    });

    it('un paiement accepté vide le panier et affiche la commande', async () => {
      await openCard();
      const order = orderFor('3');

      store.settleCardPayment('ref-1', 'paid', order);

      expect(store.cart()).toEqual([]);
      expect(store.cardPayment()).toBeNull();
      expect(store.checkingOut()).toBe(false);
      expect(store.lastOrder()).toEqual(order);
    });

    it('une carte refusée conserve le panier et annonce le refus', async () => {
      await openCard();

      store.settleCardPayment('ref-1', 'refused', null);

      expect(store.cart().length).toBe(1);
      expect(store.cardPayment()).toBeNull();
      expect(store.checkingOut()).toBe(false);
      expect(store.checkoutError()).toBeTruthy();
      expect(store.lastOrder()).toBeNull();
    });

    it('une expiration se distingue d’un refus', async () => {
      await openCard();

      store.settleCardPayment('ref-1', 'expired', null);

      expect(store.checkoutError()).toContain('expiré');
    });
  });

  describe('remise', () => {
    /** Deux hot-dogs : 5,00 €. */
    function cartOfTwo(): void {
      store.startSession('3');
      store.addToCart(HOTDOG);
      store.addToCart(HOTDOG);
    }

    it('retranche la remise du total à encaisser', () => {
      cartOfTwo();

      store.setDiscount({ amountCents: 100, label: 'Geste commercial' });

      expect(store.chargedTotal()).toBe(500);
      expect(store.discountTotal()).toBe(100);
      expect(store.netTotal()).toBe(400);
    });

    /** Même plafond que `priceCart` côté serveur : sans lui, l'écran
     *  annoncerait un total négatif que l'API corrigerait en silence. */
    it('plafonne la remise au total du panier', () => {
      cartOfTwo();

      store.setDiscount({ amountCents: 99_999, label: 'Offert' });

      expect(store.discountTotal()).toBe(500);
      expect(store.netTotal()).toBe(0);
    });

    it('envoie la remise avec l’encaissement', async () => {
      cartOfTwo();
      store.setDiscount({ amountCents: 100, label: 'Geste commercial' });

      const pending = store.checkout('cash');
      const request = http.expectOne(
        (req) => req.url.endsWith('/events/3/orders') && req.method === 'POST',
      );
      expect(request.request.body.discount).toEqual({
        amountCents: 100,
        label: 'Geste commercial',
      });
      request.flush(orderFor('3'));
      await pending;
    });

    it('envoie la remise au terminal carte, pas seulement à la confirmation', async () => {
      cartOfTwo();
      store.setDiscount({ amountCents: 100, label: 'Geste commercial' });

      const pending = store.checkout('card');
      const request = http.expectOne((req) => req.url.endsWith('/events/3/card-payments'));
      expect(request.request.body.discount).toEqual({
        amountCents: 100,
        label: 'Geste commercial',
      });
      request.flush({ orderRef: 'ref-9', status: 'pending', amountCents: 400, eventId: 3 });
      await pending;
    });

    /** ⚠️ Une remise oubliée dans le panier s'appliquerait au client suivant,
     *  qui n'a rien demandé. */
    it('oublie la remise après l’encaissement', async () => {
      cartOfTwo();
      store.setDiscount({ amountCents: 100, label: 'Geste commercial' });

      const pending = store.checkout('cash');
      http
        .expectOne((req) => req.url.endsWith('/events/3/orders') && req.method === 'POST')
        .flush(orderFor('3'));
      await pending;

      expect(store.discount()).toBeNull();
    });

    it('oublie la remise en changeant de soirée', () => {
      cartOfTwo();
      store.setDiscount({ amountCents: 100, label: 'Geste commercial' });

      store.startSession('4');

      expect(store.discount()).toBeNull();
    });

    it('retire la remise sur demande', () => {
      cartOfTwo();
      store.setDiscount({ amountCents: 100, label: 'Geste commercial' });

      store.clearDiscount();

      expect(store.discount()).toBeNull();
      expect(store.netTotal()).toBe(500);
    });
  });
});
