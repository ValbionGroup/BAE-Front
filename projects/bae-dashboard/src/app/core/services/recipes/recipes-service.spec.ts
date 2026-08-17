import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RecipesService } from './recipes-service';
import { API_BASE_URL } from '@bae/ui';

const baseUrl = 'http://api.test/v1';

describe(RecipesService.name, () => {
  let service: RecipesService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    service = TestBed.inject(RecipesService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  /**
   * `ProductsController.update` réécrit les quatre colonnes d'entête à chaque
   * appel : un `PATCH` partiel n'en préserverait aucune. La route accepte les
   * deux verbes, donc rien côté API ne signalerait l'erreur — ce test est le
   * seul garde-fou contre un passage en `PATCH` fait par souci de justesse
   * REST.
   */
  it('writes a recipe with PUT, never PATCH', () => {
    service
      .update(4, {
        name: 'Crêpe',
        isVegetarian: true,
        description: null,
        recipe: null,
        goods: [],
      })
      .subscribe();

    const request = http.expectOne(`${baseUrl}/products/4`);
    expect(request.request.method).toBe('PUT');
    request.flush({ id: 4, name: 'Crêpe' });
  });
});
