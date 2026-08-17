import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SessionStore } from './session.store';

describe(SessionStore.name, () => {
  let store: SessionStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('part de « pas encore su », et non de « déconnecté »', () => {
    expect(store.status()).toBe('unknown');
    expect(store.isAuthenticated()).toBe(false);
  });

  /**
   * Le cas qui distingue un client d'un membre : la zone publique n'exige aucune
   * ligne `members`, donc `member` arrive à `null`. Le déréférencer ferait
   * échouer la toute première requête du front public.
   */
  it('accepte un profil sans ligne membre', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 7, email: 'client@enseirb.fr' },
        member: null,
      });

    expect(store.status()).toBe('authenticated');
    expect(store.user()).toEqual({
      id: 7,
      email: 'client@enseirb.fr',
      firstName: null,
      lastName: null,
    });
  });

  it('reprend le nom quand le compte est aussi membre', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 1, email: 'staff@enseirb.fr' },
        member: { firstName: 'Alex', lastName: 'Admin' },
      });

    expect(store.user()?.firstName).toBe('Alex');
  });

  it('traite un 401 comme une visite anonyme, pas comme un incident', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush(
        { code: 'E_UNAUTHORIZED', message: 'nope' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(store.status()).toBe('anonymous');
    expect(store.user()).toBeNull();
  });

  it('redevient anonyme même si la déconnexion échoue côté serveur', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 7, email: 'client@enseirb.fr' },
        member: null,
      });

    store.logout();
    http
      .expectOne((req) => req.url.endsWith('/auth/logout'))
      .flush({}, { status: 500, statusText: 'Server Error' });

    expect(store.status()).toBe('anonymous');
    expect(store.user()).toBeNull();
  });
});
