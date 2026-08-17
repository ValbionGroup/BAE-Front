import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RecipesStore } from './recipes.store';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { RecipeProduct, RecipeWritePayload } from '#pages/authed/recettes/recipes.types';

const baseUrl = 'http://api.test/v1';

function product(overrides: Partial<RecipeProduct> = {}): RecipeProduct {
  return {
    id: 1,
    name: 'Crêpe',
    isVegetarian: true,
    category: 'Dessert',
    ingredientCount: 2,
    lastPrice: 3,
    cost: 1,
    ...overrides,
  };
}

/** Le rechargement qui suit une écriture part dans une micro-tâche : sans
 *  cette respiration, la requête n'est pas encore émise. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

const payload: RecipeWritePayload = {
  name: 'Crêpe',
  isVegetarian: true,
  description: null,
  recipe: null,
  goods: [],
};

describe(RecipesStore.name, () => {
  let store: InstanceType<typeof RecipesStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    store = TestBed.inject(RecipesStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function loadWith(products: RecipeProduct[]): Promise<void> {
    const pending = store.load();
    http.expectOne((r) => r.url.endsWith('/products/summary')).flush(products);
    await pending;
  }

  /**
   * Coût, marge, catégorie et nombre d'ingrédients sont calculés par
   * `products/summary`. Sans ce rechargement, la liste garderait les valeurs
   * d'avant l'écriture — et la recette créée n'y figurerait même pas.
   */
  it('reloads the summary after a write so the list reflects it', async () => {
    await loadWith([]);

    const pending = store.createRecipe(payload);
    http.expectOne((r) => r.method === 'POST' && r.url.endsWith('/products')).flush({ id: 7 });
    await tick();
    http
      .expectOne((r) => r.method === 'GET' && r.url.endsWith('/products/summary'))
      .flush([product({ id: 7 })]);

    expect(await pending).toBe(7);
    expect(store.products()).toHaveLength(1);
  });

  /**
   * Le back refuse en 409 la suppression d'une recette déjà vendue : les pivots
   * sont en `ON DELETE CASCADE`, donc la supprimer effacerait cet historique.
   * Le message nomme ce qui bloque — l'avaler laisserait l'utilisateur devant
   * un bouton sans effet.
   */
  it('surfaces the refusal and keeps the recipe when deletion is denied', async () => {
    await loadWith([product()]);

    const pending = store.deleteRecipe(1);
    http
      .expectOne((r) => r.method === 'DELETE' && r.url.endsWith('/products/1'))
      .flush(
        { code: 'E_PRODUCT_IN_USE', message: 'Cette recette est utilisée par 2 commandes.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(await pending).toBe(false);
    expect(store.deleteError()).toBe('Cette recette est utilisée par 2 commandes.');
    expect(store.products()).toHaveLength(1);
  });
});
