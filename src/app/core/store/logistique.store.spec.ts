import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LogistiqueStore } from './logistique.store';
import type { ApiGood, ApiVoucher } from '#pages/authed/logistique/logistique.types';

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
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(LogistiqueStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flush(goods: ApiGood[], vouchers: ApiVoucher[]): void {
    http.expectOne((r) => r.url.endsWith('/goods') && r.method === 'GET').flush(goods);
    http.expectOne((r) => r.url.endsWith('/vouchers') && r.method === 'GET').flush(vouchers);
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
    // The vouchers leg is answered first: once goods errors, `forkJoin`
    // unsubscribes and its sibling request can no longer be flushed.
    http.expectOne((r) => r.url.endsWith('/vouchers')).flush([]);
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
});
