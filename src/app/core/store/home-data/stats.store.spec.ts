import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiStockItem } from '#core/services/stocks/stocks-service';
import { StocksStore } from '#core/store/stocks.store';

import { StatsStore } from './stats.store';

function stockItem(over: Partial<ApiStockItem>): ApiStockItem {
  return {
    id: 1,
    name: 'Produit',
    unit: 'u',
    brand: null,
    categoryId: 1,
    categoryName: 'Divers',
    supplierId: null,
    totalRemainingQty: 0,
    batchCount: 0,
    nearestExpirationDate: null,
    expiredBatchCount: 0,
    soonBatchCount: 0,
    ...over,
  };
}

describe(StatsStore.name, () => {
  let store: InstanceType<typeof StatsStore>;
  let stocks: InstanceType<typeof StocksStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(StatsStore);
    stocks = TestBed.inject(StocksStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('reports loading while its source stores are untouched', () => {
    expect(store.loading()).toBe(true);
  });

  it('derives the stock tiles from StocksStore, reusing its DLC buckets', async () => {
    const loaded = stocks.load();
    httpMock
      .expectOne(`${baseUrl}/stocks`)
      .flush([
        stockItem({ id: 1, totalRemainingQty: 12, expiredBatchCount: 1, soonBatchCount: 2 }),
        stockItem({ id: 2, totalRemainingQty: 0 }),
      ]);
    // `StocksStore.load()` charge aussi les catégories du formulaire de
    // création : sans cette réponse, le `forkJoin` n'émet jamais.
    httpMock.expectOne(`${baseUrl}/categories`).flush([]);
    await loaded;

    const byLabel = new Map(store.data().map((k) => [k.label, k.value]));
    expect(byLabel.get('Produits en stock')).toBe('1');
    expect(byLabel.get('Lots à surveiller')).toBe('3');
  });

  it('leaves every delta empty — the API exposes no previous-period value', () => {
    expect(store.data().every((k) => k.delta === '')).toBe(true);
  });

  it('surfaces a stocks failure as an error message', async () => {
    const loaded = stocks.load();
    httpMock.expectOne(`${baseUrl}/stocks`).error(new ProgressEvent('failed'));
    await loaded;

    expect(store.error()).toBeTruthy();
  });
});
