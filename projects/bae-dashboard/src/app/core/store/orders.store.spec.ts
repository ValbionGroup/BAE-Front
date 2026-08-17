import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { OrdersStore } from './orders.store';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiOrder } from '#core/services/orders/orders-service';
import type { PreOrderTicket } from '#core/models/pre-order.model';

const baseUrl = 'http://api.test/v1';

function apiOrder(overrides: Partial<ApiOrder> = {}): ApiOrder {
  return {
    id: 1,
    number: 1,
    eventId: 7,
    status: 'pending',
    clientName: 'Anonyme',
    lines: [{ productId: 3, productName: 'Hot-dog', quantity: 1, unitPrice: 250 }],
    totalCents: 250,
    createdAt: '2026-08-15T19:00:00.000Z',
    updatedAt: '2026-08-15T19:00:00.000Z',
    ...overrides,
  };
}

function ticket(overrides: Partial<PreOrderTicket> = {}): PreOrderTicket {
  return {
    id: 1,
    reference: 'P1',
    eventId: 7,
    status: 'pending',
    clientName: 'Alice',
    lines: [{ productId: 3, productName: 'Hot-dog', quantity: 2, receivedQuantity: 0 }],
    paid: true,
    fullyCollected: false,
    pickupAt: '2026-08-15T20:00:00.000Z',
    due: true,
    createdAt: '2026-08-14T10:00:00.000Z',
    ...overrides,
  };
}

describe(OrdersStore.name, () => {
  let store: InstanceType<typeof OrdersStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    store = TestBed.inject(OrdersStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * Répond aux appels de `load()`.
   *
   * ⚠️ Les précommandes ne partent qu'**après** la résolution des commandes —
   * c'est ce qui permet à leur échec de ne pas emporter le chemin critique.
   * D'où la micro-tâche cédée au milieu : sans elle, la requête n'existe pas
   * encore quand on la réclame.
   */
  async function flushLoad(
    orders: ApiOrder[],
    preOrders: PreOrderTicket[] | 'fail',
  ): Promise<void> {
    http.expectOne(`${baseUrl}/events/7/orders`).flush(orders);
    http.expectOne(`${baseUrl}/events/7/sellable`).flush([]);

    await new Promise((resolve) => setTimeout(resolve, 0));

    const req = http.expectOne(`${baseUrl}/events/7/pre-orders`);
    if (preOrders === 'fail') {
      req.flush({ code: 'E_FORBIDDEN', message: 'Non.' }, { status: 403, statusText: 'Forbidden' });
    } else {
      req.flush(preOrders);
    }
  }

  it('charge commandes et précommandes séparément', async () => {
    const promise = store.load('7');
    await flushLoad([apiOrder()], [ticket()]);
    await promise;

    expect(store.orders().length).toBe(1);
    expect(store.preOrders().length).toBe(1);
    expect(store.loading()).toBe('loaded');
  });

  it('garde la file de commandes quand les précommandes sont refusées', async () => {
    const promise = store.load('7');
    await flushLoad([apiOrder()], 'fail');
    await promise;

    // Le chemin critique survit à l'accessoire : la cuisine voit ses commandes.
    expect(store.orders().length).toBe(1);
    expect(store.preOrders()).toEqual([]);
    expect(store.loading()).toBe('loaded');
    expect(store.loadError()).toBeNull();
  });

  it("n'affiche en attente que les précommandes dues", async () => {
    const promise = store.load('7');
    await flushLoad(
      [],
      [ticket({ id: 1, due: true }), ticket({ id: 2, reference: 'P2', due: false })],
    );
    await promise;

    expect(store.pendingPreOrders().map((t) => t.id)).toEqual([1]);
  });

  it('garde une précommande démarrée visible même si elle cesse d’être due', async () => {
    const promise = store.load('7');
    await flushLoad([], [ticket({ id: 9, status: 'in_progress', due: false })]);
    await promise;

    expect(store.inProgressPreOrders().map((t) => t.id)).toEqual([9]);
  });

  it('trie les précommandes par heure de retrait, sans heure en tête', async () => {
    const promise = store.load('7');
    await flushLoad(
      [],
      [
        ticket({ id: 1, pickupAt: '2026-08-15T21:00:00.000Z' }),
        ticket({ id: 2, pickupAt: null }),
        ticket({ id: 3, pickupAt: '2026-08-15T20:00:00.000Z' }),
      ],
    );
    await promise;

    expect(store.pendingPreOrders().map((t) => t.id)).toEqual([2, 3, 1]);
  });

  it('remet une précommande par /collect, pas par un changement de statut', async () => {
    const promise = store.load('7');
    await flushLoad([], [ticket({ id: 4 })]);
    await promise;

    const collected = store.collectPreOrder(4);
    http
      .expectOne({ url: `${baseUrl}/pre-orders/4/collect`, method: 'POST' })
      .flush(ticket({ id: 4, status: 'completed', fullyCollected: true }));

    expect(await collected).toBe(true);
    expect(store.preOrders()[0].status).toBe('completed');
  });

  it('remonte le refus du serveur sans perdre le ticket', async () => {
    const promise = store.load('7');
    await flushLoad([], [ticket({ id: 5, paid: false })]);
    await promise;

    const collected = store.collectPreOrder(5);
    http
      .expectOne(`${baseUrl}/pre-orders/5/collect`)
      .flush(
        { code: 'E_PRE_ORDER_UNPAID', message: 'Aucun paiement rattaché.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(await collected).toBe(false);
    expect(store.preOrders().length).toBe(1);
    expect(store.loadError()).toBe('Aucun paiement rattaché.');
  });

  it('remplace une précommande poussée par le serveur plutôt que de la dupliquer', async () => {
    const promise = store.load('7');
    await flushLoad([], [ticket({ id: 6, status: 'pending' })]);
    await promise;

    store.upsertPreOrder(ticket({ id: 6, status: 'ready' }));

    expect(store.preOrders().length).toBe(1);
    expect(store.readyPreOrders().map((t) => t.id)).toEqual([6]);
  });
});
