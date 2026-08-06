import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiLog } from '#core/services/logs/logs-service';

import { ActivityFeedStore } from './activity-feed.store';

function log(over: Partial<ApiLog>): ApiLog {
  return {
    id: 1,
    level: 'info',
    message: 'GET /v1/events → 200 (13ms)',
    method: 'GET',
    url: '/v1/events',
    ip: '127.0.0.1',
    userId: 1,
    createdAt: new Date().toISOString(),
    user: { id: 1, casId: 'lespiet', email: 'lespiet@bordeaux-inp.fr' },
    ...over,
  };
}

describe(ActivityFeedStore.name, () => {
  let store: InstanceType<typeof ActivityFeedStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(ActivityFeedStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  async function load(rows: ApiLog[]): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/logs`).flush(rows);
    await loaded;
  }

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('keeps only write requests — GETs are read noise, not activity', async () => {
    await load([log({ id: 1, method: 'GET' }), log({ id: 2, method: 'POST', url: '/v1/events' })]);

    expect(store.data().length).toBe(1);
    expect(store.data()[0].emphasis).toBe('/v1/events');
  });

  it('labels the row with the CAS login, the only identity /v1/logs exposes', async () => {
    await load([log({ id: 2, method: 'POST' })]);
    expect(store.data()[0].who).toBe('lespiet');
  });

  it('falls back to the email local part, then to "Système"', async () => {
    await load([
      log({
        id: 2,
        method: 'POST',
        createdAt: '2026-08-02T10:00:00.000+00:00',
        user: { id: 3, casId: null, email: 'bob@bae.fr' },
      }),
      log({
        id: 3,
        method: 'POST',
        createdAt: '2026-08-01T10:00:00.000+00:00',
        user: null,
        userId: null,
      }),
    ]);

    expect(store.data().map((a) => a.who)).toEqual(['bob', 'Système']);
  });

  it('turns the HTTP verb into a phrase and flags failures', async () => {
    await load([
      log({ id: 2, method: 'DELETE', level: 'error', createdAt: '2026-08-01T10:00:00.000+00:00' }),
    ]);

    expect(store.data()[0].what).toBe('a supprimé');
    expect(store.data()[0].tail).toBe('— échec serveur');
    expect(store.data()[0].when.length).toBeGreaterThan(0);
  });

  it('shows the most recent entries first and caps the feed', async () => {
    const rows = Array.from({ length: 10 }, (_, i) =>
      log({
        id: i + 1,
        method: 'POST',
        url: `/v1/thing/${i + 1}`,
        createdAt: new Date(2026, 0, i + 1).toISOString(),
      }),
    );
    await load(rows);

    expect(store.data().length).toBe(6);
    expect(store.data()[0].emphasis).toBe('/v1/thing/10');
  });

  it('does not refetch once loaded', async () => {
    await load([log({ id: 2, method: 'POST' })]);
    await store.load();
    httpMock.verify();
  });

  it('reports an error when the call fails', async () => {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/logs`).error(new ProgressEvent('failed'));
    await loaded;

    expect(store.error()).toBeTruthy();
    expect(store.data()).toEqual([]);
  });
});
