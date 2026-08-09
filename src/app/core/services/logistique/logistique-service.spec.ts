import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LogistiqueService } from './logistique-service';
import { API_BASE_URL } from '#core/tokens/api-url.token';

const baseUrl = 'http://api.test/v1';

describe(LogistiqueService.name, () => {
  let service: LogistiqueService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    service = TestBed.inject(LogistiqueService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('fetches the supplier list', () => {
    service.getSuppliers().subscribe();
    const req = http.expectOne(`${baseUrl}/suppliers`);
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('posts a voucher payload as-is', () => {
    service
      .createVoucher({
        supplierId: 3,
        value: 25.5,
        expiresAt: '2026-12-31',
        condition: 'à partir de 80 €',
      })
      .subscribe();

    const req = http.expectOne(`${baseUrl}/vouchers`);
    expect(req.request.method).toBe('POST');
    // camelCase ici : c'est apiCaseRequestInterceptor qui snake_case le corps,
    // et il n'est pas monté dans ce harnais de test.
    expect(req.request.body).toEqual({
      supplierId: 3,
      value: 25.5,
      expiresAt: '2026-12-31',
      condition: 'à partir de 80 €',
    });
    req.flush({});
  });

  it('patches only usedAt when consuming a voucher', () => {
    service.setVoucherUsed(7, '2026-08-09T12:00:00.000Z').subscribe();

    const req = http.expectOne(`${baseUrl}/vouchers/7`);
    // PATCH et non PUT : le contrôleur ne lit que les clés présentes, donc
    // aucune autre colonne n'est touchée.
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ usedAt: '2026-08-09T12:00:00.000Z' });
    req.flush({});
  });

  it('patches usedAt to null when cancelling a consumption', () => {
    service.setVoucherUsed(7, null).subscribe();

    const req = http.expectOne(`${baseUrl}/vouchers/7`);
    // La clé doit être *présente* et nulle : le back distingue une clé absente
    // (ne touche pas la colonne) d'une clé nulle (efface la date).
    expect(req.request.body).toEqual({ usedAt: null });
    req.flush({});
  });
});
