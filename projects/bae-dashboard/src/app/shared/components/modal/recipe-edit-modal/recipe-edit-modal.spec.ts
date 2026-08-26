import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RecipeEditModal } from './recipe-edit-modal';
import { API_BASE_URL } from '@bae/ui';

const baseUrl = 'http://api.test/v1';

/** Accès typé aux membres `protected` du composant, comme les autres specs de
 *  modale du dépôt. */
interface ModalApi {
  onName(value: string): void;
  onCategoryId(value: string): void;
  categoryId(): string;
  addLine(): void;
  setGood(key: string, goodId: string): void;
  setQuantity(key: string, quantity: string): void;
  moveLine(key: string, delta: number): void;
  lines(): readonly { key: string }[];
  submit(): Promise<void>;
}

/** Le rechargement de la liste qui suit une écriture part dans une
 *  micro-tâche : sans cette respiration, la requête n'est pas encore émise. */
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function stockItem(id: number, name: string) {
  return {
    id,
    name,
    unit: 'kg',
    brand: null,
    categoryId: 1,
    categoryName: 'Sec',
    supplierId: null,
    totalRemainingQty: 0,
    batchCount: 0,
    nearestExpirationDate: null,
    expiredBatchCount: 0,
    soonBatchCount: 0,
  };
}

describe(RecipeEditModal.name, () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [RecipeEditModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function open(recipeId: number | null): ComponentFixture<RecipeEditModal> {
    const fixture = TestBed.createComponent(RecipeEditModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('recipeId', recipeId);
    fixture.detectChanges();
    // Catalogue d'ingrédients, chargé par `StocksStore` à l'ouverture.
    http.expectOne(`${baseUrl}/stocks`).flush([stockItem(10, 'Farine'), stockItem(11, 'Sucre')]);
    // ⚠️ **Deux** requêtes `/categories` : `StocksStore` la demande pour le
    // sélecteur d'ingrédients, `ReferentielsStore` pour les référentiels. Un
    // `expectOne` échouerait sur « found 2 requests ».
    for (const request of http.match(`${baseUrl}/categories`)) request.flush([]);
    // ⚠️ `ReferentielsStore.load()` charge les **quatre** listes de référence : le
    // sélecteur de catégorie n'en lit qu'une, mais les trois autres partent
    // quand même. Sans cette vidange, `http.verify()` échoue sur tout le fichier.
    http.expectOne(`${baseUrl}/suppliers`).flush([]);
    http.expectOne(`${baseUrl}/jobs`).flush([]);
    http
      .expectOne(`${baseUrl}/product-categories`)
      .flush([{ id: 4, name: 'Desserts', productsCount: 0 }]);
    return fixture;
  }

  function api(fixture: ComponentFixture<RecipeEditModal>): ModalApi {
    return fixture.componentInstance as unknown as ModalApi;
  }

  /**
   * Le back dérive `product_goods.rank` de la position dans le tableau. Envoyer
   * les lignes dans un autre ordre que celui affiché inverserait la méthode
   * d'assemblage sans que rien ne le signale.
   */
  it('sends the ingredients in the order shown on screen', async () => {
    const fixture = open(null);
    const modal = api(fixture);

    modal.onName('Crêpe');
    modal.addLine();
    modal.addLine();
    const [first, second] = modal.lines().map((line) => line.key);
    modal.setGood(first, '10');
    modal.setQuantity(first, '5');
    modal.setGood(second, '11');
    modal.setQuantity(second, '2');
    // Le sucre remonte devant la farine.
    modal.moveLine(second, -1);

    const submitted = modal.submit();
    const request = http.expectOne(`${baseUrl}/products`);
    expect(request.request.body.goods).toEqual([
      { goodId: 11, quantity: 2, instruction: null },
      { goodId: 10, quantity: 5, instruction: null },
    ]);
    request.flush({ id: 9, name: 'Crêpe' });
    await tick();
    http.expectOne(`${baseUrl}/products/summary`).flush([]);
    await submitted;
  });

  /**
   * Une recette consomme une fraction d'unité d'achat. La virgule décimale est
   * ce qu'on tape sur un clavier français, et `Number('0,0833')` vaut `NaN` :
   * validation et envoi doivent passer par la même lecture.
   */
  it('accepte une quantité décimale, virgule comprise', async () => {
    const fixture = open(null);
    const modal = api(fixture);

    modal.onName('Hot-dog');
    modal.addLine();
    const [line] = modal.lines().map((l) => l.key);
    modal.setGood(line, '10');
    modal.setQuantity(line, '0,0833');

    const submitted = modal.submit();
    const request = http.expectOne(`${baseUrl}/products`);
    expect(request.request.body.goods).toEqual([
      { goodId: 10, quantity: 0.0833, instruction: null },
    ]);
    request.flush({ id: 9, name: 'Hot-dog' });
    await tick();
    http.expectOne(`${baseUrl}/products/summary`).flush([]);
    await submitted;
  });

  it('refuse une quantité nulle ou illisible', async () => {
    const fixture = open(null);
    const modal = api(fixture);

    modal.onName('Hot-dog');
    modal.addLine();
    const [line] = modal.lines().map((l) => l.key);
    modal.setGood(line, '10');

    for (const bad of ['0', '-1', 'abc', '']) {
      modal.setQuantity(line, bad);
      await modal.submit();
      http.expectNone(`${baseUrl}/products`);
    }
  });

  /**
   * La clé primaire de `product_goods` est `(product_id, good_id)`. Sans ce
   * contrôle, la deuxième occurrence part à l'API pour en revenir en refus.
   */
  it('refuses to submit the same good twice', async () => {
    const fixture = open(null);
    const modal = api(fixture);

    modal.onName('Crêpe');
    modal.addLine();
    modal.addLine();
    for (const line of modal.lines()) modal.setGood(line.key, '10');

    await modal.submit();

    http.expectNone(`${baseUrl}/products`);
  });

  /**
   * `products/summary` ne renvoie ni `description` ni `recipe`, et `update()`
   * réécrit les quatre colonnes d'entête. Un formulaire nourri par la liste
   * viderait donc ces deux colonnes au premier renommage.
   */
  it('preserves description and method when only the name changes', async () => {
    const fixture = open(4);
    http.expectOne(`${baseUrl}/products/4`).flush({
      id: 4,
      name: 'Crêpe',
      isVegetarian: true,
      description: 'Crêpe de froment.',
      recipe: 'Chauffer la plaque puis verser.',
    });
    http.expectOne(`${baseUrl}/products/4/ingredients`).flush([]);
    // Le `Promise.all` qui remplit le formulaire se résout en micro-tâche ;
    // tant qu'il ne l'a pas fait, la modale se croit en chargement et refuse
    // d'envoyer.
    await tick();

    const modal = api(fixture);
    modal.onName('Crêpe sucrée');

    const submitted = modal.submit();
    const request = http.expectOne(`${baseUrl}/products/4`);
    expect(request.request.body).toMatchObject({
      name: 'Crêpe sucrée',
      description: 'Crêpe de froment.',
      recipe: 'Chauffer la plaque puis verser.',
    });
    request.flush({ id: 4, name: 'Crêpe sucrée' });
    await tick();
    http.expectOne(`${baseUrl}/products/summary`).flush([]);
    await submitted;
  });

  /**
   * ⚠️ La colonne est **nullable** : « sans catégorie » n'est pas une anomalie,
   * et doit partir en `null`, jamais en chaîne vide — `productValidator` la
   * refuserait, et une chaîne vide s'afficherait comme une catégorie muette.
   */
  it('envoie null quand aucune catégorie n’est choisie', async () => {
    const fixture = open(null);
    const modal = api(fixture);

    modal.onName('Crêpe');

    const submitted = modal.submit();
    const request = http.expectOne(`${baseUrl}/products`);
    expect(request.request.body.productCategoryId).toBeNull();
    request.flush({ id: 9, name: 'Crêpe' });
    await tick();
    http.expectOne(`${baseUrl}/products/summary`).flush([]);
    await submitted;
  });

  it('envoie l’identifiant de la catégorie choisie', async () => {
    const fixture = open(null);
    const modal = api(fixture);

    modal.onName('Crêpe');
    modal.onCategoryId('4');

    const submitted = modal.submit();
    const request = http.expectOne(`${baseUrl}/products`);
    expect(request.request.body.productCategoryId).toBe(4);
    request.flush({ id: 9, name: 'Crêpe' });
    await tick();
    http.expectOne(`${baseUrl}/products/summary`).flush([]);
    await submitted;
  });

  /** À la modification, le sélecteur s'ouvre sur la catégorie déjà posée. */
  it('reprend la catégorie de la recette à la modification', async () => {
    const fixture = open(7);
    const modal = api(fixture);

    http.expectOne(`${baseUrl}/products/7`).flush({
      id: 7,
      name: 'Crêpe Nutella',
      isVegetarian: true,
      description: null,
      recipe: null,
      productCategoryId: 4,
    });
    http.expectOne(`${baseUrl}/products/7/ingredients`).flush([]);
    await tick();
    fixture.detectChanges();

    expect(modal.categoryId()).toBe('4');
  });

  /**
   * ⚠️ Le pendant DOM du test au-dessus. `categoryId()` valait déjà « 4 » et le
   * `<select>` affichait quand même « Sans catégorie » : un `[value]` sur un
   * `<select>` s'applique **avant** que les `<option>` du `@for` n'existent, et
   * une valeur sans option correspondante est jetée par le navigateur. Ici les
   * catégories arrivent après le détail de la recette, donc plus rien ne
   * réapplique la valeur.
   */
  it('présélectionne la catégorie de la recette dans le select rendu', async () => {
    const fixture = open(7);

    http.expectOne(`${baseUrl}/products/7`).flush({
      id: 7,
      name: 'Crêpe Nutella',
      isVegetarian: true,
      description: null,
      recipe: null,
      productCategoryId: 4,
    });
    http.expectOne(`${baseUrl}/products/7/ingredients`).flush([]);
    await tick();
    fixture.detectChanges();

    const select = (fixture.nativeElement as HTMLElement).querySelector('select');
    expect(select?.value).toBe('4');
  });

  /** Même piège sur les lignes d'ingrédients : leur `<select>` liste le
   *  catalogue, chargé lui aussi séparément. */
  it('présélectionne l’ingrédient de chaque ligne dans le select rendu', async () => {
    const fixture = open(7);

    http.expectOne(`${baseUrl}/products/7`).flush({
      id: 7,
      name: 'Crêpe Nutella',
      isVegetarian: true,
      description: null,
      recipe: null,
      productCategoryId: null,
    });
    http
      .expectOne(`${baseUrl}/products/7/ingredients`)
      .flush([{ id: 11, name: 'Sucre', quantity: 2, instruction: null }]);
    await tick();
    fixture.detectChanges();

    const selects = (fixture.nativeElement as HTMLElement).querySelectorAll('select');
    // Le premier est celui de la catégorie ; le second, la ligne d'ingrédient.
    expect(selects[1]?.value).toBe('11');
  });
});
