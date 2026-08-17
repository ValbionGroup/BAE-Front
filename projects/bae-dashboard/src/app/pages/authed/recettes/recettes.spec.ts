import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Recettes } from './recettes';
import { API_BASE_URL } from '@bae/ui';
import { PrintService } from '#core/services/print/print-service';

const baseUrl = 'http://api.test/v1';

interface PageApi {
  select(id: number): void;
  onSaved(recipeId: number): void;
  printRecipe(recipeId: number, nom: string): void;
}

describe(Recettes.name, () => {
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Recettes],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    }).compileComponents();
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  /**
   * Le panneau de détail tient ses ingrédients d'un second endpoint, que
   * `RecipesStore.refresh()` ne touche pas. Éditer la recette déjà sélectionnée
   * lui réaffecte le même id, et un signal ne notifie pas sur une valeur
   * identique : sans le compteur de version, l'écran garderait la composition
   * d'avant l'enregistrement.
   */
  it('reloads the ingredients after saving the recipe already on screen', async () => {
    const fixture = TestBed.createComponent(Recettes);
    fixture.detectChanges();
    http.expectOne(`${baseUrl}/products/summary`).flush([
      {
        id: 1,
        name: 'Crêpe',
        isVegetarian: true,
        category: 'Dessert',
        ingredientCount: 1,
        lastPrice: 3,
        cost: 1,
      },
    ]);
    await fixture.whenStable();

    const page = fixture.componentInstance as unknown as PageApi;
    page.select(1);
    fixture.detectChanges();
    http.expectOne(`${baseUrl}/products/1/ingredients`).flush([]);
    await fixture.whenStable();

    page.onSaved(1);
    fixture.detectChanges();

    http.expectOne(`${baseUrl}/products/1/ingredients`).flush([]);
    await fixture.whenStable();
  });

  it('prints the selected recipe', () => {
    const fixture = TestBed.createComponent(Recettes);
    const printService = TestBed.inject(PrintService);
    const downloadSpy = vi.spyOn(printService, 'download').mockImplementation(() => {});
    fixture.detectChanges();
    http.expectOne(`${baseUrl}/products/summary`).flush([]);

    const page = fixture.componentInstance as unknown as PageApi;
    page.printRecipe(5, 'Hot-dog');

    expect(downloadSpy).toHaveBeenCalledWith('/products/5/recipe/pdf', expect.any(String));
  });
});
