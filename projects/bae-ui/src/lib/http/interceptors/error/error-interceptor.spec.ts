import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { vi, type Mock } from 'vitest';

import { errorInterceptor } from './error-interceptor';
import { SESSION_EXPIRED_HANDLER } from '../../session-expired.token';
import { API_BASE_URL } from '../../api-url.token';

describe('errorInterceptor', () => {
  const apiBaseUrl = 'http://api.test';
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let onSessionExpired: Mock<() => void>;

  /** `null` monte l'intercepteur sans crochet, comme le fait `bae-public`. */
  const setup = (handler: (() => void) | null) => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
        ...(handler ? [{ provide: SESSION_EXPIRED_HANDLER, useValue: handler }] : []),
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  };

  const expectUnauthorized = (url: string) => {
    http.get(url).subscribe({ next: () => undefined, error: () => undefined });
    httpMock.expectOne(url).flush(null, { status: 401, statusText: 'Unauthorized' });
  };

  beforeEach(() => {
    onSessionExpired = vi.fn<() => void>();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('signale la session expirée sur un 401 de l’API', () => {
    setup(onSessionExpired);

    expectUnauthorized(`${apiBaseUrl}/events`);

    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it('laisse l’erreur remonter à l’appelant', () => {
    setup(onSessionExpired);
    let status: number | undefined;

    http.get(`${apiBaseUrl}/events`).subscribe({ error: (err) => (status = err.status) });
    httpMock
      .expectOne(`${apiBaseUrl}/events`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
  });

  /**
   * ⚠️ Le 401 de `/auth/login` veut dire « identifiants incorrects », et celui de
   * `/auth/2fa/verify` « mauvais code ». Les traiter comme une session expirée
   * remplacerait le message d'erreur du formulaire par une redirection, sur une
   * page où l'utilisateur n'a jamais eu de session à perdre.
   */
  it.each(['/auth/login', '/auth/2fa/verify', '/auth/2fa/challenge'])(
    'ignore le 401 anonyme de %s',
    (path) => {
      setup(onSessionExpired);

      expectUnauthorized(`${apiBaseUrl}${path}`);

      expect(onSessionExpired).not.toHaveBeenCalled();
    },
  );

  /**
   * ⚠️ `/account/profile` répond 401 à **chaque démarrage anonyme** : c'est ainsi
   * que la réhydratation découvre qu'il n'y a pas de session. Le compter comme une
   * expiration renverrait vers `/login` un visiteur de la zone publique qui n'a
   * rien demandé.
   */
  it('ignore le 401 de la réhydratation', () => {
    setup(onSessionExpired);

    expectUnauthorized(`${apiBaseUrl}/account/profile`);

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('ignore les erreurs qui ne sont pas des 401', () => {
    setup(onSessionExpired);

    http.get(`${apiBaseUrl}/events`).subscribe({ error: () => undefined });
    httpMock
      .expectOne(`${apiBaseUrl}/events`)
      .flush(null, { status: 403, statusText: 'Forbidden' });

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('ignore les URL hors de l’API', () => {
    setup(onSessionExpired);

    expectUnauthorized('http://ailleurs.test/events');

    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it('reste un passe-plat quand aucun crochet n’est fourni', () => {
    setup(null);
    let status: number | undefined;

    http.get(`${apiBaseUrl}/events`).subscribe({ error: (err) => (status = err.status) });
    httpMock
      .expectOne(`${apiBaseUrl}/events`)
      .flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(status).toBe(401);
  });
});
