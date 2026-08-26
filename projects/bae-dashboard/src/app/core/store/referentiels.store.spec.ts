import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import { ReferentielsStore } from './referentiels.store';

const baseUrl = 'http://api.test/v1';

/**
 * ⚠️ Le rechargement part **après** que l'écriture a résolu. Sans céder la main
 * à la file de microtâches, `expectOne` cherche une requête qui n'est pas encore
 * émise — le même piège que dans `live.spec.ts`.
 */
const settle = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('ReferentielsStore', () => {
  let store: InstanceType<typeof ReferentielsStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    store = TestBed.inject(ReferentielsStore);
    http = TestBed.inject(HttpTestingController);
  });

  /** Sert les trois listes que `load()` et chaque rechargement demandent. */
  function flushAll(
    categories: unknown[] = [],
    suppliers: unknown[] = [],
    jobs: unknown[] = [],
    productCategories: unknown[] = [],
  ): void {
    http.expectOne(`${baseUrl}/categories`).flush(categories);
    http.expectOne(`${baseUrl}/suppliers`).flush(suppliers);
    http.expectOne(`${baseUrl}/jobs`).flush(jobs);
    // ⚠️ Quatrième liste depuis le 2026-08-26 : les catégories de recettes.
    http.expectOne(`${baseUrl}/product-categories`).flush(productCategories);
  }

  it('charge les quatre listes en une fois', async () => {
    const loaded = store.load();
    flushAll(
      [{ id: 1, name: 'Boissons', goodsCount: 3 }],
      [{ id: 2, name: 'Metro', pricedGoodsCount: 4, voucherCount: 1 }],
      [{ id: 3, name: 'Grill', type: 'during', description: null }],
      [{ id: 4, name: 'Desserts', productsCount: 2 }],
    );
    await loaded;

    expect(store.categories()[0].goodsCount).toBe(3);
    expect(store.suppliers()[0].voucherCount).toBe(1);
    expect(store.jobs()[0].name).toBe('Grill');
    expect(store.productCategories()[0].productsCount).toBe(2);
    expect(store.loading()).toBe('loaded');
  });

  /**
   * ⚠️ Le 409 porte une phrase que l'utilisateur doit lire — « 1 bon d'achat
   * rattaché à Metro ». Une promesse rejetée que personne n'attend est une
   * erreur avalée : le patron `{ ok, error }` est celui d'`EventsStore`.
   */
  it('rend le refus du serveur plutôt que de le rejeter', async () => {
    const deleting = store.deleteSupplier(2);
    http
      .expectOne(`${baseUrl}/suppliers/2`)
      .flush(
        { code: 'E_SUPPLIER_IN_USE', message: '1 bon(s) d’achat rattaché(s) à « Metro ».' },
        { status: 409, statusText: 'Conflict' },
      );
    const result = await deleting;

    expect(result.ok).toBe(false);
  });

  /** Un refus ne recharge rien : il n'y a rien de nouveau à lire. */
  it('ne recharge pas les listes quand l’écriture échoue', async () => {
    const deleting = store.deleteSupplier(2);
    http
      .expectOne(`${baseUrl}/suppliers/2`)
      .flush({ code: 'E_SUPPLIER_IN_USE', message: 'refus' }, { status: 409, statusText: 'x' });
    await deleting;
    await settle();

    http.expectNone(`${baseUrl}/categories`);
  });

  it('relit les quatre listes après une suppression aboutie', async () => {
    const loaded = store.load();
    flushAll([{ id: 1, name: 'Boissons', goodsCount: 0 }]);
    await loaded;

    const deleting = store.deleteCategory(1);
    http
      .expectOne(`${baseUrl}/categories/1`)
      .flush(null, { status: 204, statusText: 'No Content' });
    await settle();
    // ⚠️ Les compteurs d'usage appartiennent au serveur : une écriture aboutie
    // relit, elle ne rejoue pas le calcul côté client.
    flushAll();
    await deleting;

    expect(store.categories()).toEqual([]);
  });

  it('envoie le nom rogné à la création d’une catégorie', async () => {
    const creating = store.createCategory('Épicerie');
    const request = http.expectOne(`${baseUrl}/categories`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ name: 'Épicerie' });
    request.flush({ id: 9, name: 'Épicerie', goodsCount: 0 });
    await settle();
    flushAll();
    await creating;
  });
});
