import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LogistiqueStore } from './logistique.store';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiGood, ApiSupplier, ApiVoucher } from '#pages/authed/logistique/logistique.types';

const baseUrl = 'http://api.test/v1';

function good(overrides: Partial<ApiGood> = {}): ApiGood {
  return {
    id: 1,
    name: 'Saucisses',
    unit: 'kg',
    brand: null,
    categoryId: null,
    category: null,
    suppliers: [],
    bestSupplier: null,
    bestPrice: null,
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
    value: 50,
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

  function flush(goods: ApiGood[], vouchers: ApiVoucher[], suppliers: ApiSupplier[] = []): void {
    http.expectOne((r) => r.url.endsWith('/goods') && r.method === 'GET').flush(goods);
    http.expectOne((r) => r.url.endsWith('/vouchers') && r.method === 'GET').flush(vouchers);
    http.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'GET').flush(suppliers);
  }

  /** Charge la page avec les trois appels que fait désormais `load()`. */
  async function loadWith(vouchers: ApiVoucher[]): Promise<void> {
    const loading = store.load();
    flush([], vouchers, [supplier()]);
    await loading;
  }

  it('starts idle', () => {
    expect(store.loading()).toBe('init');
    expect(store.goods()).toEqual([]);
    expect(store.vouchers()).toEqual([]);
  });

  it('loads goods and vouchers together', async () => {
    const pending = store.load();
    flush([good()], [voucher()]);
    await pending;

    expect(store.loading()).toBe('loaded');
    expect(store.goods()).toHaveLength(1);
    expect(store.vouchers()).toHaveLength(1);
  });

  it('formats the expiry DATE without shifting it across a timezone', async () => {
    const pending = store.load();
    flush([], [voucher({ expiresAt: '2026-01-01' })]);
    await pending;

    expect(store.vouchers()[0].expiresLabel).toBe('01/01/2026');
  });

  it('passes the server urgency flags through untouched', async () => {
    const pending = store.load();
    flush([], [voucher({ warn: true, expired: false, used: false, daysUntilExpiry: 3 })]);
    await pending;

    expect(store.vouchers()[0]).toMatchObject({ warn: true, expired: false, used: false });
  });

  it('labels a voucher with no supplier rather than dropping it', async () => {
    const pending = store.load();
    flush([], [voucher({ supplierId: null, supplier: null })]);
    await pending;

    expect(store.vouchers()[0].supplierName).toBe('Enseigne non précisée');
  });

  it('handles an empty voucher list', async () => {
    const pending = store.load();
    flush([good()], []);
    await pending;

    expect(store.loading()).toBe('loaded');
    expect(store.vouchers()).toEqual([]);
  });

  it('records an error state when a request fails', async () => {
    const pending = store.load();
    // The vouchers and suppliers legs are answered first: once goods errors,
    // `forkJoin` unsubscribes and its siblings can no longer be flushed —
    // they would then stay open and trip `http.verify()`.
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
    http.expectOne((r) => r.url.endsWith('/suppliers')).flush([]);
    http
      .expectOne((r) => r.url.endsWith('/goods'))
      .flush(null, { status: 500, statusText: 'Server Error' });
    await pending;

    expect(store.loading()).toBe('error');
    expect(store.loadError()).toBeTruthy();
  });

  it('does not refetch once loaded, but refresh() bypasses the guard', async () => {
    const first = store.load();
    flush([good({ id: 1 })], []);
    await first;

    await store.load();
    http.expectNone((r) => r.url.endsWith('/goods'));

    const second = store.refresh();
    flush([good({ id: 1 }), good({ id: 2 })], []);
    await second;

    expect(store.goods()).toHaveLength(2);
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
      value: 10,
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
      value: 10,
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
      value: 10,
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

  it('keeps the creation error out of the card error', async () => {
    await loadWith([voucher({ id: 1 })]);

    const created = store.createVoucher({
      supplierId: 3,
      value: 10,
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
    http.expectOne((r) => r.url.endsWith('/goods') && r.method === 'GET').flush([good()]);
    http
      .expectOne((r) => r.url.endsWith('/vouchers') && r.method === 'GET')
      .flush({ message: 'Missing permission: voucher:read' }, { status: 403, statusText: 'x' });
    http.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'GET').flush([supplier()]);
    await loading;

    // Le comparatif d'enseignes n'a rien de confidentiel : un refus sur les
    // bons ne doit pas l'emporter avec lui.
    expect(store.loading()).toBe('loaded');
    expect(store.loadError()).toBeNull();
    expect(store.goods()).toHaveLength(1);
    expect(store.vouchers()).toEqual([]);
    expect(store.vouchersForbidden()).toBe(true);
    expect(store.vouchersLoadError()).toBeNull();
  });

  it('separates a broken vouchers endpoint from a forbidden one', async () => {
    const loading = store.load();
    http.expectOne((r) => r.url.endsWith('/goods') && r.method === 'GET').flush([good()]);
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
    http.expectOne((r) => r.url.endsWith('/goods') && r.method === 'GET').flush([]);
    http
      .expectOne((r) => r.url.endsWith('/vouchers') && r.method === 'GET')
      .flush(null, { status: 403, statusText: 'x' });
    http.expectOne((r) => r.url.endsWith('/suppliers') && r.method === 'GET').flush([]);
    await loading;
    expect(store.vouchersForbidden()).toBe(true);

    const again = store.refresh();
    flush([], [voucher({ id: 1 })], [supplier()]);
    await again;

    // Un droit accordé entre-temps doit se voir sans recharger l'application.
    expect(store.vouchersForbidden()).toBe(false);
    expect(store.vouchers()).toHaveLength(1);
  });
});
