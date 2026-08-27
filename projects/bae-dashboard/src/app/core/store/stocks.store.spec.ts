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

  /** Laisse le `refresh()` enchaîné sur la réponse émettre ses requêtes. */
  function tick(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('enters a batch in stock and refreshes the aggregates behind it', async () => {
    await loadWith([item({ totalRemainingQty: 12, batchCount: 1 })]);

    const entered = store.createBatch({ goodId: 1, quantity: 6, expirationDate: '2026-11-04' });
    const req = http.expectOne(`${baseUrl}/stock-batches`);
    expect(req.request.body).toEqual({ goodId: 1, quantity: 6, expirationDate: '2026-11-04' });
    req.flush({ id: 30 });
    await tick();

    // Sans ce rechargement, le tableau garde les 12 d'avant : la ligne du lot
    // n'est pas ce que la page affiche, ce sont les agrégats par denrée.
    http.expectOne(`${baseUrl}/stocks`).flush([item({ totalRemainingQty: 18, batchCount: 2 })]);
    http.expectOne(`${baseUrl}/categories`).flush([{ id: 2, name: 'Boisson' }]);
    const result = await entered;

    expect(result).toEqual({ ok: true });
    expect(store.products()[0]).toMatchObject({ totalQty: 18, batchCount: 2 });
  });

  it('takes a quantity out of a batch and refreshes', async () => {
    await loadWith([item({ totalRemainingQty: 12 })]);

    const removed = store.removeFromBatch({ goodId: 1, stockBatchId: 42, quantity: 4 });
    http.expectOne(`${baseUrl}/stock-movements`).flush({ id: 7 });
    await tick();
    http.expectOne(`${baseUrl}/stocks`).flush([item({ totalRemainingQty: 8 })]);
    http.expectOne(`${baseUrl}/categories`).flush([{ id: 2, name: 'Boisson' }]);
    const result = await removed;

    expect(result).toEqual({ ok: true });
    expect(store.products()[0].totalQty).toBe(8);
  });

  /** Le refus voyage dans la valeur résolue — patron de `setSupplierPrice` —
   *  pour que l'écran montre `E_STOCK_INSUFFICIENT` au lieu de l'avaler. */
  it('hands a refused withdrawal back instead of refreshing', async () => {
    await loadWith([item({ totalRemainingQty: 12 })]);

    const removed = store.removeFromBatch({ goodId: 1, stockBatchId: 42, quantity: 99 });
    http
      .expectOne(`${baseUrl}/stock-movements`)
      .flush(
        { code: 'E_STOCK_INSUFFICIENT', message: 'Ce lot ne porte plus que 12 unité(s).' },
        { status: 422, statusText: 'Unprocessable' },
      );
    const result = await removed;

    expect(result.ok).toBe(false);
    expect(store.products()[0].totalQty).toBe(12);
  });

  it('supprime chaque denrée sélectionnée, puis recharge une seule fois', async () => {
    await loadWith([item({ id: 1 }), item({ id: 2, name: 'Farine' })]);

    const deleted = store.deleteGoods([1, 2]);
    http.expectOne(`${baseUrl}/goods/1`).flush(null);
    await tick();
    http.expectOne(`${baseUrl}/goods/2`).flush(null);
    await tick();

    // Un seul rechargement pour tout le lot : deux suppressions ne justifient
    // pas deux allers-retours sur la liste entière.
    http.expectOne(`${baseUrl}/stocks`).flush([]);
    http.expectOne(`${baseUrl}/categories`).flush([{ id: 2, name: 'Boisson' }]);
    const result = await deleted;

    expect(result).toEqual({ deleted: 2, error: null });
    expect(store.products()).toHaveLength(0);
  });

  /** Un refus ne doit pas emporter les suivants — patron de `validate()`. */
  it('poursuit après un refus et le remonte', async () => {
    await loadWith([item({ id: 1 }), item({ id: 2, name: 'Farine' })]);

    const deleted = store.deleteGoods([1, 2]);
    http
      .expectOne(`${baseUrl}/goods/1`)
      .flush({ code: 'E_FORBIDDEN', message: 'Droit manquant.' }, { status: 403, statusText: 'x' });
    await tick();
    http.expectOne(`${baseUrl}/goods/2`).flush(null);
    await tick();
    http.expectOne(`${baseUrl}/stocks`).flush([item({ id: 1 })]);
    http.expectOne(`${baseUrl}/categories`).flush([{ id: 2, name: 'Boisson' }]);
    const result = await deleted;

    expect(result.deleted).toBe(1);
    expect(result.error).not.toBeNull();
  });

  /**
   * Ce que la modale de suppression doit annoncer : la cascade emporte la
   * ligne de la denrée dans chaque recette, en silence côté API.
   */
  it('nomme les recettes que la suppression amputerait', async () => {
    await loadWith([item({ id: 1 }), item({ id: 2 })]);

    const usage = store.getGoodUsage([1, 2]);
    http.expectOne(`${baseUrl}/goods/1`).flush({ products: [{ id: 3, name: 'Crêpes' }] });
    http.expectOne(`${baseUrl}/goods/2`).flush({
      products: [
        { id: 3, name: 'Crêpes' },
        { id: 4, name: 'Gâteau' },
      ],
    });
    const result = await usage;

    // Dédupliqué : deux denrées d'une même recette ne la citent pas deux fois.
    expect(result.recipeNames).toEqual(['Crêpes', 'Gâteau']);
    expect(result.complete).toBe(true);
  });

  /** Ne pas pouvoir lire les recettes ne doit pas bloquer un ménage. */
  it('signale un relevé incomplet plutôt que d’échouer', async () => {
    await loadWith([item({ id: 1 })]);

    const usage = store.getGoodUsage([1]);
    http.expectOne(`${baseUrl}/goods/1`).flush(null, { status: 500, statusText: 'x' });
    const result = await usage;

    expect(result.complete).toBe(false);
    expect(result.recipeNames).toEqual([]);
  });
});
