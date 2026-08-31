import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { ProfileStore } from './profile.store';
import {
  SessionStore,
  type ClientProfile,
  type ProfileResponse,
  type TelegramLink,
} from './session.store';

const NO_TELEGRAM: TelegramLink = { handle: null, linked: false, linkedAt: null };

const CLIENT: ClientProfile = {
  phone: '0612345678',
  promotion: 'I2',
  school: 'ENSEIRB',
  registeredAt: '2026-01-12',
  preparationNote: 'Sans gluten',
};

/** Lire et écrire le profil rendent la même enveloppe : le pseudo vit sur `user`. */
const profile = (over: Partial<ProfileResponse> = {}): ProfileResponse => ({
  user: { id: 7, email: 'c@enseirb.fr', telegram: NO_TELEGRAM },
  member: null,
  client: CLIENT,
  ...over,
});

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
    http.expectOne((req) => req.url.endsWith('/account/profile')).flush(profile());
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
    request.flush(profile({ client: { ...CLIENT, phone: '0699999999' } }));
  });

  it('adopte la version normalisée renvoyée par le serveur', async () => {
    const saved = store.save({ telegramHandle: '@lea_m' });

    http
      .expectOne((req) => req.method === 'PATCH')
      .flush(
        profile({
          user: { id: 7, email: 'c@enseirb.fr', telegram: { ...NO_TELEGRAM, handle: 'lea_m' } },
        }),
      );

    expect(await saved).toBe(true);
    expect(session.user()?.telegram.handle).toBe('lea_m');
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

describe(`${ProfileStore.name} — liaison Telegram`, () => {
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
    http.expectOne((req) => req.url.endsWith('/account/profile')).flush(profile());
  });

  afterEach(() => {
    http.verify();
    TestBed.resetTestingModule();
  });

  it('rend l’URL de liaison émise par le serveur', async () => {
    const asked = store.startTelegramLink();

    http
      .expectOne((req) => req.method === 'POST' && req.url.endsWith('/account/telegram/link'))
      .flush({
        url: 'https://t.me/bae_bot?start=K7M3QZ8XW2VP',
        code: 'K7M3QZ8XW2VP',
        botUsername: 'bae_bot',
        expiresAt: '2026-08-30T14:15:00.000Z',
      });

    expect(await asked).toBe('https://t.me/bae_bot?start=K7M3QZ8XW2VP');
  });

  it('signale un refus sans prétendre avoir une URL', async () => {
    const asked = store.startTelegramLink();

    http
      .expectOne((req) => req.method === 'POST')
      .flush(
        { code: 'E_TELEGRAM_ALREADY_LINKED', message: 'Déjà lié.' },
        { status: 409, statusText: 'Conflict' },
      );

    expect(await asked).toBeNull();
    expect(store.saveError()).toBe('Déjà lié.');
  });

  it('délier remplace la liaison par la réponse du serveur', async () => {
    const unlinked = store.unlinkTelegram();

    http
      .expectOne((req) => req.method === 'DELETE' && req.url.endsWith('/account/telegram/link'))
      .flush({ handle: 'lea_m', linked: false, linkedAt: null });

    expect(await unlinked).toBe(true);
    expect(session.user()?.telegram).toEqual({ handle: 'lea_m', linked: false, linkedAt: null });
  });
});
