import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { StocksService } from './stocks-service';

const baseUrl = 'http://api.test/v1';

describe(StocksService.name, () => {
  let service: StocksService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    service = TestBed.inject(StocksService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('takes a quantity out of one batch', () => {
    service.removeFromBatch({ goodId: 7, stockBatchId: 42, quantity: 3 }).subscribe();

    const req = http.expectOne(`${baseUrl}/stock-movements`);
    expect(req.request.method).toBe('POST');
    // `movementType` n'est pas un paramètre : ce service ne sait que sortir du
    // stock. Une entrée passe par un lot, jamais par un mouvement.
    expect(req.request.body).toEqual({
      goodId: 7,
      stockBatchId: 42,
      quantity: 3,
      movementType: 'out',
    });
    req.flush({ id: 1 });
  });

  it('supprime une denrée par son id', () => {
    service.deleteGood(7).subscribe();

    const req = http.expectOne(`${baseUrl}/goods/7`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  /**
   * ⚠️ La même route sert les tarifs **et** les recettes qui utilisent la
   * denrée : `GET /goods/:id` renvoie la fiche entière, `products` compris.
   * C'est ce champ qui permet de dire ce qu'une suppression amputerait.
   */
  it('lit la fiche complète d’une denrée, recettes comprises', async () => {
    let detail: { products: readonly { name: string }[] } | undefined;
    service.getGood(7).subscribe((value) => (detail = value));

    http.expectOne(`${baseUrl}/goods/7`).flush({
      id: 7,
      name: 'Farine T55',
      unit: 'kg',
      suppliers: [],
      bestSupplier: null,
      bestPrice: null,
      products: [{ id: 3, name: 'Crêpes' }],
    });

    expect(detail?.products.map((p) => p.name)).toEqual(['Crêpes']);
  });
});
