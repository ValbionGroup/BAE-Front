import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { API_BASE_URL, ExternalNavigation } from '@bae/ui';
import { vi } from 'vitest';

import { SessionStore } from './session.store';

describe(SessionStore.name, () => {
  let store: SessionStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    // ⚠️ Les fichiers de test partagent un même environnement : sans cette
    // remise à zéro, le `TestBed` reste instancié et le fichier suivant échoue
    // sur « test module has already been instantiated ».
    TestBed.resetTestingModule();
  });

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

  /**
   * ⚠️ Une **navigation**, pas un XHR : sans elle, la session Keycloak reste
   * ouverte et recliquer « EirbConnect » reconnecte sans mot de passe. Le
   * serveur révoque le jeton et efface le cookie avant de rediriger, donc l'état
   * local n'a rien à nettoyer ici.
   */
  it('quitte l’application vers la déconnexion globale', () => {
    const navigation = TestBed.inject(ExternalNavigation);
    vi.spyOn(navigation, 'go').mockImplementation(() => undefined);

    store.logout();

    expect(navigation.go).toHaveBeenCalledWith(
      'http://api.test/v1/auth/keycloak/logout?app=public',
    );
  });
});
