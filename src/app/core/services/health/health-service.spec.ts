import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { HealthService } from './health-service';
import { API_BASE_URL } from '#core/tokens/api-url.token';

describe('HealthService', () => {
  let service: HealthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    });
    service = TestBed.inject(HealthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('interroge la racine de l’API, et non le préfixe /v1', () => {
    service.check().subscribe();

    // L'endpoint santé vit à la racine : dériver l'URL du token évite de la
    // dupliquer dans l'environnement.
    httpMock.expectOne('http://api.test/').flush({ health: true, status: 'ok' });
  });

  it('rapporte « ok » quand l’API répond 200', async () => {
    const status = service.check();
    const result = firstValue(status);

    httpMock.expectOne('http://api.test/').flush({ health: true, status: 'ok' });

    expect(await result).toBe('ok');
  });

  it('rapporte « degraded » quand l’API répond 503 avec son rapport', async () => {
    const result = firstValue(service.check());

    httpMock
      .expectOne('http://api.test/')
      .flush(
        { health: false, status: 'error', problems: [{ name: 'database', message: 'down' }] },
        { status: 503, statusText: 'Service Unavailable' },
      );

    expect(await result).toBe('degraded');
  });

  it('rapporte « down » quand l’API ne répond pas du tout', async () => {
    const result = firstValue(service.check());

    // Panne réseau : `HttpClient` produit un statut 0, sans corps.
    httpMock.expectOne('http://api.test/').error(new ProgressEvent('error'));

    expect(await result).toBe('down');
  });

  it('rapporte « down » sur une erreur serveur qui n’est pas un rapport de santé', async () => {
    const result = firstValue(service.check());

    httpMock
      .expectOne('http://api.test/')
      .flush('Internal Server Error', { status: 500, statusText: 'Internal Server Error' });

    expect(await result).toBe('down');
  });

  it('ne laisse jamais échapper d’erreur à l’appelant', async () => {
    // Le badge ne doit pas pouvoir casser l'écran de connexion : toute panne se
    // traduit par une valeur, jamais par une exception non rattrapée.
    const result = firstValue(service.check());

    httpMock.expectOne('http://api.test/').error(new ProgressEvent('error'));

    await expect(result).resolves.toBeDefined();
  });
});

function firstValue<T>(source: { subscribe: (o: (value: T) => void) => unknown }): Promise<T> {
  return new Promise<T>((resolve) => source.subscribe(resolve));
}
