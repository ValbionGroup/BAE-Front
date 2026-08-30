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

  it('compose le nom affichable à partir du membre', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({
        user: { id: 1, email: 'staff@enseirb.fr' },
        member: { firstName: 'Alex', lastName: 'Admin' },
      });

    expect(store.displayName()).toBe('Alex Admin');
  });

  // Un client n'a pas de ligne `members` : l'e-mail entier déborderait de
  // l'en-tête, c'est sa partie locale qui l'identifie.
  it('retombe sur la partie locale de l’e-mail sans nom connu', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ user: { id: 7, email: 'client@enseirb.fr' }, member: null });

    expect(store.displayName()).toBe('client');
  });

  it('n’affiche aucun nom tant que personne n’est connu', () => {
    expect(store.displayName()).toBe('');
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

describe(`${SessionStore.name} — bloc client`, () => {
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
    TestBed.resetTestingModule();
  });

  const CLIENT = {
    phone: '0612345678',
    promotion: 'I2',
    school: 'ENSEIRB',
    registeredAt: '2026-01-12',
    preparationNote: 'Allergie arachide',
    telegram: { handle: null, linked: false, linkedAt: null },
  };

  it('expose les coordonnées du client', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ user: { id: 7, email: 'c@enseirb.fr' }, member: null, client: CLIENT });

    expect(store.client()).toEqual(CLIENT);
  });

  // Un membre du bureau qui n'a jamais ouvert la zone publique n'a pas de ligne.
  it('tolère un profil sans ligne client', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ user: { id: 1, email: 's@enseirb.fr' }, member: null, client: null });

    expect(store.client()).toBeNull();
    expect(store.status()).toBe('authenticated');
  });

  /** Une sauvegarde ne doit jamais pouvoir faire basculer l'état de session. */
  it('remplace le bloc client sans toucher au statut', () => {
    store.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ user: { id: 7, email: 'c@enseirb.fr' }, member: null, client: CLIENT });

    store.setClient({ ...CLIENT, phone: '0699999999' });

    expect(store.client()?.phone).toBe('0699999999');
    expect(store.status()).toBe('authenticated');
  });
});
