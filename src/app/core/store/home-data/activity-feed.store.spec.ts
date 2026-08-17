import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { ActivityFeedStore } from './activity-feed.store';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiActivityEvent } from '#core/services/activity/activity-service';

const API = 'http://api.test/v1';

function event(overrides: Partial<ApiActivityEvent> = {}): ApiActivityEvent {
  return {
    id: 1,
    verb: 'production.launched',
    subjectType: 'event',
    subjectId: 4,
    actorName: 'Léa Martin',
    payload: { what: 'a lancé la production de', emphasis: 'Hot-dog', tail: '× 200' },
    occurredAt: new Date().toISOString(),
    ...overrides,
  };
}

describe(ActivityFeedStore.name, () => {
  let store: InstanceType<typeof ActivityFeedStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: API },
      ],
    });
    store = TestBed.inject(ActivityFeedStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    TestBed.resetTestingModule();
  });

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  /**
   * ⚠️ Le fil lit `/v1/activity`, **jamais** `/v1/logs`. Ces derniers sont des
   * journaux HTTP : les afficher donnerait « lespiet a créé /v1/events », soit
   * l'apparence d'un fil d'activité sans en être un.
   */
  it('lit le fil métier, et pas le journal HTTP', async () => {
    const promise = store.load();

    const req = httpMock.expectOne(`${API}/activity`);
    expect(req.request.method).toBe('GET');
    req.flush([event()]);
    await promise;

    expect(store.data()).toHaveLength(1);
    expect(store.data()[0].who).toBe('Léa Martin');
    expect(store.data()[0].what).toBe('a lancé la production de');
    expect(store.data()[0].emphasis).toBe('Hot-dog');
  });

  /** Une liste vide veut dire « rien ne s'est passé », pas « pas de source ». */
  it('se dit indisponible quand le serveur ne rend rien', async () => {
    const promise = store.load();
    httpMock.expectOne(`${API}/activity`).flush([]);
    await promise;

    expect(store.unavailable()).toBe(true);
    expect(store.loading()).toBe(false);
  });

  it('signale une erreur sans la confondre avec un fil vide', async () => {
    const promise = store.load();
    httpMock.expectOne(`${API}/activity`).flush(null, { status: 500, statusText: 'Server Error' });
    await promise;

    expect(store.error()).not.toBeNull();
    expect(store.unavailable()).toBe(false);
  });

  /** Un verbe dont personne n'a écrit la formulation reste affichable. */
  it('retombe sur une phrase générique si le payload est muet', async () => {
    const promise = store.load();
    httpMock.expectOne(`${API}/activity`).flush([event({ payload: {} })]);
    await promise;

    expect(store.data()[0].what).toBe('a effectué une action');
    expect(store.data()[0].emphasis).toBeUndefined();
  });
});
