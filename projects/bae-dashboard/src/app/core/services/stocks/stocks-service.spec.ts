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
});
