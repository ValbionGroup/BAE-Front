import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import type { ApiStockItem } from '#core/services/stocks/stocks-service';
import { StocksStore } from '#core/store/stocks.store';

import { AlertsStore } from './alerts.store';

function stockItem(over: Partial<ApiStockItem>): ApiStockItem {
  return {
    id: 1,
    name: 'Produit',
    unit: 'u',
    brand: null,
    categoryId: 1,
    categoryName: 'Divers',
    supplierId: null,
    totalRemainingQty: 5,
    batchCount: 1,
    nearestExpirationDate: null,
    expiredBatchCount: 0,
    soonBatchCount: 0,
    storageMethod: null,
    ...over,
  };
}

describe(AlertsStore.name, () => {
  let store: InstanceType<typeof AlertsStore>;
  let stocks: InstanceType<typeof StocksStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AlertsStore);
    stocks = TestBed.inject(StocksStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  async function loadStocks(items: ApiStockItem[]): Promise<void> {
    const loaded = stocks.load();
    httpMock.expectOne(`${baseUrl}/stocks`).flush(items);
    // `StocksStore.load()` charge aussi les catégories du formulaire de
    // création : sans cette réponse, le `forkJoin` n'émet jamais.
    httpMock.expectOne(`${baseUrl}/categories`).flush([]);
    await loaded;
  }

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('is empty when nothing in stock needs attention', async () => {
    await loadStocks([stockItem({ id: 1 })]);
    expect(store.loading()).toBe(false);
    expect(store.data()).toEqual([]);
  });

  it('builds one alert per DLC bucket already computed by StocksStore', async () => {
    await loadStocks([
      stockItem({ id: 1, name: 'Bière', expiredBatchCount: 2 }),
      stockItem({ id: 2, name: 'Chips', soonBatchCount: 1 }),
      stockItem({ id: 3, name: 'Jus', totalRemainingQty: 0 }),
    ]);

    const titles = store.data().map((a) => a.title);
    expect(titles).toEqual(['2 lots périmés', '1 lot proche de la DLC', '1 produit épuisé']);
    expect(store.data()[0].sub).toBe('Bière');
    expect(store.data()[0].fgClass).toBe('text-red');
  });

  it('surfaces a stocks failure as an error message', async () => {
    const loaded = stocks.load();
    httpMock.expectOne(`${baseUrl}/stocks`).error(new ProgressEvent('failed'));
    await loaded;

    expect(store.error()).toBeTruthy();
    expect(store.data()).toEqual([]);
  });
});
