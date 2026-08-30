import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { ProfileStore } from './profile.store';
import { SessionStore, type ClientProfile } from './session.store';

const CLIENT: ClientProfile = {
  phone: '0612345678',
  promotion: 'I2',
  school: 'ENSEIRB',
  registeredAt: '2026-01-12',
  preparationNote: 'Sans gluten',
  telegram: { handle: null, linked: false, linkedAt: null },
};

describe(ProfileStore.name, () => {
  let store: ProfileStore;
  let session: SessionStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    });
    store = TestBed.inject(ProfileStore);
    session = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);

    session.load();
    http
      .expectOne((req) => req.url.endsWith('/account/profile'))
      .flush({ user: { id: 7, email: 'c@enseirb.fr' }, member: null, client: CLIENT });
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  /** Une clé absente veut dire « ne touche pas » : envoyer tout le profil effacerait. */
  it('n’envoie que les champs fournis', () => {
    void store.save({ phone: '0699999999' });

    const request = http.expectOne((req) => req.method === 'PATCH');
    expect(request.request.body).toEqual({ phone: '0699999999' });
    request.flush({ ...CLIENT, phone: '0699999999' });
  });

  it('adopte la version normalisée renvoyée par le serveur', async () => {
    const saved = store.save({ telegramHandle: '@lea_m' });

    http
      .expectOne((req) => req.method === 'PATCH')
      .flush({ ...CLIENT, telegram: { handle: 'lea_m', linked: false, linkedAt: null } });

    expect(await saved).toBe(true);
    expect(session.client()?.telegram.handle).toBe('lea_m');
    expect(store.saving()).toBe(false);
  });

  it('garde la valeur affichée quand le serveur refuse', async () => {
    const saved = store.save({ telegramHandle: 'a-b' });

    http
      .expectOne((req) => req.method === 'PATCH')
      .flush(
        { code: 'E_VALIDATION', message: 'Pseudo invalide.' },
        { status: 422, statusText: 'Unprocessable Entity' },
      );

    expect(await saved).toBe(false);
    expect(store.saveError()).toBe('Pseudo invalide.');
    expect(session.client()).toEqual(CLIENT);
  });
});
