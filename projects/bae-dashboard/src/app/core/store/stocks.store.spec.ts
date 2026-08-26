import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { addDays, format } from 'date-fns';

import { StocksStore } from './stocks.store';
import { API_BASE_URL } from '@bae/ui';
import type { ApiStockItem } from '#core/services/stocks/stocks-service';

const baseUrl = 'http://api.test/v1';

function item(overrides: Partial<ApiStockItem> = {}): ApiStockItem {
  return {
    id: 1,
    name: 'Bière',
    unit: 'btl',
    brand: null,
    categoryId: 2,
    categoryName: 'Boisson',
    supplierId: null,
    totalRemainingQty: 12,
    batchCount: 1,
    nearestExpirationDate: null,
    expiredBatchCount: 0,
    soonBatchCount: 0,
    ...overrides,
  };
}

describe(StocksStore.name, () => {
  let store: InstanceType<typeof StocksStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    store = TestBed.inject(StocksStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /** Charge la page avec les deux appels que fait désormais `load()`. */
  async function loadWith(items: ApiStockItem[]): Promise<void> {
    const loading = store.load();
    http.expectOne(`${baseUrl}/stocks`).flush(items);
    http.expectOne(`${baseUrl}/categories`).flush([{ id: 2, name: 'Boisson' }]);
    await loading;
  }

  /** Une DLC exprimée en jours par rapport à aujourd'hui, au format du back. */
  const dlcIn = (days: number): string => format(addDays(new Date(), days), 'yyyy-MM-dd');

  const statusOf = async (days: number): Promise<string> => {
    await loadWith([item({ nearestExpirationDate: dlcIn(days) })]);
    return store.products()[0].nearestDlcStatus;
  };

  /**
   * La borne qui compte : `expiration_date` est une colonne `date`, servie en
   * `YYYY-MM-DD`. Lue comme de l'UTC puis comparée à minuit **local**, une DLC
   * du jour tombe trois heures dans le passé à l'ouest de Greenwich — le lot
   * s'affiche périmé le matin même de sa date.
   *
   * ⚠️ Ne mord qu'à l'ouest de Greenwich.
   */
  it('ne déclare pas périmé un lot dont la DLC est aujourd’hui', async () => {
    expect(await statusOf(0)).toBe('soon');
  });

  it('déclare périmé un lot dont la DLC est passée', async () => {
    expect(await statusOf(-1)).toBe('expired');
  });

  it('alerte à sept jours, plus au-delà', async () => {
    expect(await statusOf(7)).toBe('soon');
    TestBed.resetTestingModule();
  });

  it('n’alerte pas encore à huit jours', async () => {
    expect(await statusOf(8)).toBe('ok');
  });

  it('affiche la DLC au jour servi par l’API', async () => {
    await loadWith([item({ nearestExpirationDate: '2026-08-31' })]);

    expect(store.products()[0].nearestDlc).toBe('31/08/26');
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('loads the categories that feed the create form', async () => {
    await loadWith([]);

    expect(store.categories()).toEqual([{ id: 2, name: 'Boisson' }]);
  });

  it('keeps the stock table when the categories endpoint fails', async () => {
    const loading = store.load();
    http.expectOne(`${baseUrl}/stocks`).flush([item()]);
    http
      .expectOne(`${baseUrl}/categories`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    await loading;

    // Les catégories ne servent qu'au formulaire : leur panne ne doit pas
    // emporter le tableau, qui est la raison d'être de la page.
    expect(store.loading()).toBe('loaded');
    expect(store.products()).toHaveLength(1);
    expect(store.categories()).toEqual([]);
  });

  it('inserts a created product at its place in the alphabetical order', async () => {
    await loadWith([item({ id: 1, name: 'Bière' }), item({ id: 2, name: 'Vaisselle' })]);

    const created = store.createGood({
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
      barcodes: [],
    });
    http.expectOne(`${baseUrl}/goods`).flush({
      id: 9,
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
      barcodes: [],
    });
    await created;

    // Au milieu, pas à la fin : l'API trie par nom et le tableau en dépend.
    expect(store.products().map((p) => p.name)).toEqual(['Bière', 'Moutarde', 'Vaisselle']);
  });

  it('creates the product with no stock at all', async () => {
    await loadWith([]);

    const created = store.createGood({
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
      barcodes: [],
    });
    http
      .expectOne(`${baseUrl}/goods`)
      .flush({ id: 9, name: 'Moutarde', unit: 'pcs', brand: '', categoryId: 2 });
    await created;

    // Créer une référence au catalogue et en avoir en stock sont deux gestes
    // distincts : POST /goods ne crée aucun lot, la ligne doit donc naître à 0.
    expect(store.products()[0]).toMatchObject({
      totalQty: 0,
      batchCount: 0,
      nearestDlc: null,
      nearestDlcStatus: 'none',
      // Le POST ne précharge pas la catégorie : le nom vient de la liste déjà
      // chargée, sans quoi la ligne s'afficherait sans catégorie.
      categoryName: 'Boisson',
    });
  });

  it('reports the API message when a creation is refused', async () => {
    await loadWith([]);

    const created = store.createGood({
      name: 'Moutarde',
      unit: 'pcs',
      brand: '',
      categoryId: 2,
      barcodes: [],
    });
    http
      .expectOne(`${baseUrl}/goods`)
      .flush({ message: 'Unité invalide.' }, { status: 422, statusText: 'Unprocessable' });
    const ok = await created;

    expect(ok).toBeNull();
    expect(store.createError()).toBe('Unité invalide.');
    expect(store.products()).toHaveLength(0);
  });
});
