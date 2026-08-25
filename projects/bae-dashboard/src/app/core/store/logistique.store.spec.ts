import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LogistiqueStore } from './logistique.store';
import { API_BASE_URL } from '@bae/ui';
import type {
  ApiShoppingList,
  ApiSupplier,
  ApiVoucher,
} from '#pages/authed/logistique/logistique.types';

const baseUrl = 'http://api.test/v1';

function shoppingList(overrides: Partial<ApiShoppingList> = {}): ApiShoppingList {
  return {
    eventId: 7,
    eventName: 'Soirée Hivernale',
    totals: { optimumGoodsTotal: 0, furnitureTotal: 0 },
    lines: [
      {
        kind: 'good',
        id: 1,
        name: 'Pain hot-dog x12',
        unit: 'pcs',
        brand: 'Harrys',
        categoryName: 'Sec',
        needQty: 140,
        stockQty: 0,
        missingQty: 140,
        suppliers: [{ id: 3, name: 'Leclerc', price: 275 }],
        bestSupplier: { id: 3, name: 'Leclerc', price: 275 },
        bestPrice: 2.75,
      },
    ],
    lineCount: 1,
    optimumTotal: 385,
    supplierTotals: [{ id: 3, name: 'Leclerc', total: 385, fullCoverage: true }],
    savings: 0,
    unpricedCount: 0,
    ...overrides,
  };
}

function supplier(overrides: Partial<ApiSupplier> = {}): ApiSupplier {
  return { id: 3, name: 'Leclerc', ...overrides };
}

function voucher(overrides: Partial<ApiVoucher> = {}): ApiVoucher {
  return {
    id: 1,
    supplierId: 3,
    supplier: { id: 3, name: 'Leclerc' },
    value: 5000,
    expiresAt: '2026-12-31',
    condition: 'à partir de 80 €',
    usedAt: null,
    used: false,
    daysUntilExpiry: 148,
    expired: false,
    warn: false,
    ...overrides,
  };
}

describe(LogistiqueStore.name, () => {
  let store: InstanceType<typeof LogistiqueStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    store = TestBed.inject(LogistiqueStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flush(vouchers: ApiVoucher[], suppliers: ApiSupplier[] = []): void {
    http.expectOne((r) => r.url.endsWith('/vouchers') && r.method === 'GET').flush(vouchers);
    http.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'GET').flush(suppliers);
  }

  /** Charge la page avec les deux appels que fait `load()`. */
  async function loadWith(vouchers: ApiVoucher[]): Promise<void> {
    const loading = store.load();
    flush(vouchers, [supplier()]);
    await loading;
  }

  it('starts idle', () => {
    expect(store.loading()).toBe('init');
    expect(store.vouchers()).toEqual([]);
  });

  it('loads vouchers and suppliers together', async () => {
    const pending = store.load();
    flush([voucher()], [supplier()]);
    await pending;

    expect(store.loading()).toBe('loaded');
    expect(store.vouchers()).toHaveLength(1);
    expect(store.suppliers()).toHaveLength(1);
  });

  it('formats the expiry DATE without shifting it across a timezone', async () => {
    const pending = store.load();
    flush([voucher({ expiresAt: '2026-01-01' })]);
    await pending;

    expect(store.vouchers()[0].expiresLabel).toBe('01/01/2026');
  });

  it('passes the server urgency flags through untouched', async () => {
    const pending = store.load();
    flush([voucher({ warn: true, expired: false, used: false, daysUntilExpiry: 3 })]);
    await pending;

    expect(store.vouchers()[0]).toMatchObject({ warn: true, expired: false, used: false });
  });

  it('labels a voucher with no supplier rather than dropping it', async () => {
    const pending = store.load();
    flush([voucher({ supplierId: null, supplier: null })]);
    await pending;

    expect(store.vouchers()[0].supplierName).toBe('Enseigne non précisée');
  });

  it('handles an empty voucher list', async () => {
    const pending = store.load();
    flush([]);
    await pending;

    expect(store.loading()).toBe('loaded');
    expect(store.vouchers()).toEqual([]);
  });

  it('records an error state when a request fails', async () => {
    const pending = store.load();
    // La branche des bons est servie d'abord : une fois les enseignes en erreur,
    // `forkJoin` se désabonne et sa sœur ne peut plus être servie — elle
    // resterait ouverte et ferait échouer `http.verify()`.
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
    http
      .expectOne((r) => r.url.endsWith('/suppliers'))
      .flush(null, { status: 500, statusText: 'Server Error' });
    await pending;

    expect(store.loading()).toBe('error');
    expect(store.loadError()).toBeTruthy();
  });

  it('does not refetch once loaded, but refresh() bypasses the guard', async () => {
    const first = store.load();
    flush([voucher({ id: 1 })]);
    await first;

    await store.load();
    http.expectNone((r) => r.url.endsWith('/vouchers'));

    const second = store.refresh();
    flush([voucher({ id: 1 }), voucher({ id: 2 })]);
    await second;

    expect(store.vouchers()).toHaveLength(2);
  });

  it('loads the suppliers that feed the create form', async () => {
    await loadWith([]);

    expect(store.suppliers()).toEqual([{ id: 3, name: 'Leclerc' }]);
  });

  it('inserts a created voucher at its place in the expiry order', async () => {
    await loadWith([
      voucher({ id: 1, expiresAt: '2026-01-31' }),
      voucher({ id: 2, expiresAt: '2026-12-31' }),
    ]);

    const created = store.createVoucher({
      supplierId: 3,
      value: 1000,
      expiresAt: '2026-06-30',
      condition: null,
    });
    http.expectOne(`${baseUrl}/vouchers`).flush(voucher({ id: 3, expiresAt: '2026-06-30' }));
    await created;

    // Au milieu, pas à la fin : le panneau met les bons urgents en tête, et
    // l'API les renvoie triés par expiration croissante.
    expect(store.vouchers().map((v) => v.id)).toEqual([1, 3, 2]);
  });

  it('places a created voucher first when it expires soonest', async () => {
    await loadWith([voucher({ id: 1, expiresAt: '2026-12-31' })]);

    const created = store.createVoucher({
      supplierId: 3,
      value: 1000,
      expiresAt: '2026-01-01',
      condition: null,
    });
    http.expectOne(`${baseUrl}/vouchers`).flush(voucher({ id: 9, expiresAt: '2026-01-01' }));
    await created;

    expect(store.vouchers().map((v) => v.id)).toEqual([9, 1]);
  });

  it('reports the API message when a creation is refused', async () => {
    await loadWith([]);

    const created = store.createVoucher({
      supplierId: 3,
      value: 1000,
      expiresAt: '2026-06-30',
      condition: null,
    });
    http
      .expectOne(`${baseUrl}/vouchers`)
      .flush({ message: 'Valeur invalide.' }, { status: 422, statusText: 'Unprocessable' });
    const ok = await created;

    expect(ok).toBe(false);
    expect(store.createError()).toBe('Valeur invalide.');
    expect(store.vouchers()).toHaveLength(0);
  });

  it('flips the used flag before the server answers', async () => {
    await loadWith([voucher({ id: 1, used: false })]);

    const toggled = store.toggleVoucherUsed(1, true);
    // Optimiste : le badge doit basculer au clic, pas au retour réseau.
    expect(store.vouchers()[0].used).toBe(true);
    expect(store.savingVoucherIds()).toEqual([1]);

    http.expectOne(`${baseUrl}/vouchers/1`).flush(voucher({ id: 1, used: true, usedAt: 'x' }));
    await toggled;

    expect(store.vouchers()[0].used).toBe(true);
    expect(store.savingVoucherIds()).toEqual([]);
  });

  it('restores only the failed row and keeps the API message', async () => {
    await loadWith([
      voucher({ id: 1, used: false, expiresAt: '2026-01-31' }),
      voucher({ id: 2, used: false, expiresAt: '2026-12-31' }),
    ]);

    const toggled = store.toggleVoucherUsed(1, true);
    http
      .expectOne(`${baseUrl}/vouchers/1`)
      .flush({ message: 'Bon introuvable.' }, { status: 404, statusText: 'Not Found' });
    await toggled;

    expect(store.vouchers()[0].used).toBe(false);
    expect(store.vouchers()[1].used).toBe(false);
    expect(store.voucherError()).toBe('Bon introuvable.');
    expect(store.voucherErrorId()).toBe(1);
  });

  it('ignores a second toggle while the first is in flight', async () => {
    await loadWith([voucher({ id: 1, used: false })]);

    const first = store.toggleVoucherUsed(1, true);
    await store.toggleVoucherUsed(1, false); // doit être un no-op

    // Une seule requête : le double clic ne doit pas produire deux écritures
    // qui se répondraient l'une à l'autre.
    http.expectOne(`${baseUrl}/vouchers/1`).flush(voucher({ id: 1, used: true }));
    await first;

    expect(store.vouchers()[0].used).toBe(true);
  });

  it('edits a voucher and reflects the server-computed fields', async () => {
    await loadWith([voucher({ id: 1, value: 5000 })]);

    const updated = store.updateVoucher(1, { value: 8000 });
    expect(store.savingVoucherIds()).toEqual([1]);

    http.expectOne(`${baseUrl}/vouchers/1`).flush(voucher({ id: 1, value: 8000, warn: true }));
    const ok = await updated;

    expect(ok).toBe(true);
    expect(store.vouchers()[0].value).toBe(8000);
    expect(Number.isInteger(store.vouchers()[0].value)).toBe(true);
    expect(store.vouchers()[0].warn).toBe(true);
    expect(store.savingVoucherIds()).toEqual([]);
  });

  it('reports the API message and keeps the old row when an edit is refused', async () => {
    await loadWith([voucher({ id: 1, value: 5000 })]);

    const updated = store.updateVoucher(1, { value: -5 });
    http
      .expectOne(`${baseUrl}/vouchers/1`)
      .flush({ message: 'Valeur invalide.' }, { status: 422, statusText: 'x' });
    const ok = await updated;

    expect(ok).toBe(false);
    expect(store.vouchers()[0].value).toBe(5000);
    expect(store.voucherError()).toBe('Valeur invalide.');
    expect(store.voucherErrorId()).toBe(1);
  });

  it('deletes a voucher and removes it from the list', async () => {
    await loadWith([voucher({ id: 1 }), voucher({ id: 2 })]);

    const deleted = store.deleteVoucher(1);
    expect(store.savingVoucherIds()).toEqual([1]);

    http.expectOne(`${baseUrl}/vouchers/1`).flush(null, { status: 204, statusText: 'No Content' });
    const ok = await deleted;

    expect(ok).toBe(true);
    expect(store.vouchers().map((v) => v.id)).toEqual([2]);
  });

  it('keeps the voucher in the list when a delete is refused', async () => {
    await loadWith([voucher({ id: 1 })]);

    const deleted = store.deleteVoucher(1);
    http
      .expectOne(`${baseUrl}/vouchers/1`)
      .flush({ message: 'Bon introuvable.' }, { status: 404, statusText: 'x' });
    const ok = await deleted;

    expect(ok).toBe(false);
    expect(store.vouchers().map((v) => v.id)).toEqual([1]);
    expect(store.voucherError()).toBe('Bon introuvable.');
    expect(store.voucherErrorId()).toBe(1);
  });

  it('keeps the creation error out of the card error', async () => {
    await loadWith([voucher({ id: 1 })]);

    const created = store.createVoucher({
      supplierId: 3,
      value: 1000,
      expiresAt: '2026-06-30',
      condition: null,
    });
    http
      .expectOne(`${baseUrl}/vouchers`)
      .flush({ message: 'Refus.' }, { status: 422, statusText: 'x' });
    await created;

    expect(store.createError()).toBe('Refus.');
    // Un refus de création ne doit pas afficher son message sur une carte.
    expect(store.voucherError()).toBeNull();
  });

  it('keeps the page alive when the vouchers are forbidden', async () => {
    const loading = store.load();
    http
      .expectOne((r) => r.url.endsWith('/vouchers') && r.method === 'GET')
      .flush({ message: 'Missing permission: voucher:read' }, { status: 403, statusText: 'x' });
    http.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'GET').flush([supplier()]);
    await loading;

    // Le comparatif d'enseignes n'a rien de confidentiel : un refus sur les
    // bons ne doit pas l'emporter avec lui.
    expect(store.loading()).toBe('loaded');
    expect(store.loadError()).toBeNull();
    expect(store.suppliers()).toHaveLength(1);
    expect(store.vouchers()).toEqual([]);
    expect(store.vouchersForbidden()).toBe(true);
    expect(store.vouchersLoadError()).toBeNull();
  });

  it('separates a broken vouchers endpoint from a forbidden one', async () => {
    const loading = store.load();
    http
      .expectOne((r) => r.url.endsWith('/vouchers') && r.method === 'GET')
      .flush(null, { status: 500, statusText: 'Server Error' });
    http.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'GET').flush([supplier()]);
    await loading;

    expect(store.loading()).toBe('loaded');
    expect(store.vouchersForbidden()).toBe(false);
    expect(store.vouchersLoadError()).toBeTruthy();
  });

  it('clears the forbidden flag when a refresh succeeds', async () => {
    const loading = store.load();
    http
      .expectOne((r) => r.url.endsWith('/vouchers') && r.method === 'GET')
      .flush(null, { status: 403, statusText: 'x' });
    http.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'GET').flush([]);
    await loading;
    expect(store.vouchersForbidden()).toBe(true);

    const again = store.refresh();
    flush([voucher({ id: 1 })], [supplier()]);
    await again;

    // Un droit accordé entre-temps doit se voir sans recharger l'application.
    expect(store.vouchersForbidden()).toBe(false);
    expect(store.vouchers()).toHaveLength(1);
  });

  it('charge la liste de courses de la soirée demandée', async () => {
    const promise = store.loadShoppingList('7');
    // La branche « liste » est isolée : les autres appels de la page partent
    // aussi, et un 403 sur la liste ne doit rien annuler.
    http.expectOne(`${baseUrl}/events/7/shopping-list`).flush(shoppingList());
    await promise;

    expect(store.shoppingList()?.lineCount).toBe(1);
    expect(store.shoppingListEventId()).toBe('7');
    expect(store.shoppingListForbidden()).toBe(false);
  });

  it('traite un 403 sur la liste comme un refus, pas comme une panne', async () => {
    const promise = store.loadShoppingList('7');
    http
      .expectOne(`${baseUrl}/events/7/shopping-list`)
      .flush({ message: 'Missing permission: stock:read' }, { status: 403, statusText: 'F' });
    await promise;

    // Un refus est une règle, une panne est un incident : la page doit dire
    // « accès restreint », pas « erreur ».
    expect(store.shoppingListForbidden()).toBe(true);
    expect(store.shoppingListLoadError()).toBeNull();
  });

  it('traite une coupure réseau comme une panne, pas comme un refus', async () => {
    const promise = store.loadShoppingList('7');
    http.expectOne(`${baseUrl}/events/7/shopping-list`).error(new ProgressEvent('error'));
    await promise;

    // `settle` rend `status: 0` hors réponse HTTP : côté incident.
    expect(store.shoppingListForbidden()).toBe(false);
    expect(store.shoppingListLoadError()).toBeTruthy();
  });

  it('ignore la réponse d’un chargement périmé', async () => {
    const stale = store.loadShoppingList('7');
    const fresh = store.loadShoppingList('8');

    const [first, second] = http.match((request) => request.url.includes('/shopping-list'));
    // La réponse de la soirée 8 arrive AVANT celle de la 7.
    second.flush(shoppingList({ eventId: 8, eventName: 'Carnaval' }));
    first.flush(shoppingList({ eventId: 7, eventName: 'Hivernale' }));
    await Promise.all([stale, fresh]);

    // Sans compteur de génération, la réponse tardive de la 7 écraserait la 8
    // et la page afficherait la liste d'une autre soirée que celle demandée.
    expect(store.shoppingList()?.eventName).toBe('Carnaval');
  });
});
