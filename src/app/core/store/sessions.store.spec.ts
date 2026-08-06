import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { SessionsStore } from './sessions.store';
import type { ApiSession } from '#pages/authed/parametres/securite/sessions.types';

const SESSIONS_URL = '/account/sessions';

function session(overrides: Partial<ApiSession> = {}): ApiSession {
  return {
    id: 1,
    name: null,
    ipAddress: '92.184.12.3',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    lastUsedAt: '2026-08-05T10:00:00.000+00:00',
    createdAt: '2026-08-05T09:00:00.000+00:00',
    expiresAt: null,
    isCurrent: false,
    ...overrides,
  };
}

describe(SessionsStore.name, () => {
  let store: InstanceType<typeof SessionsStore>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SessionsStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function flushList(sessions: ApiSession[]): void {
    const req = http.expectOne((r) => r.url.endsWith(SESSIONS_URL) && r.method === 'GET');
    req.flush(sessions);
  }

  /** Lets pending `await` continuations run so their HTTP calls are issued. */
  function settle(): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, 0));
  }

  it('starts idle', () => {
    expect(store.loading()).toBe('init');
    expect(store.sessions()).toEqual([]);
  });

  it('loads and maps sessions into display rows', async () => {
    const pending = store.load();
    flushList([session({ id: 7, isCurrent: true })]);
    await pending;

    expect(store.loading()).toBe('loaded');
    expect(store.sessions()).toHaveLength(1);
    expect(store.sessions()[0]).toMatchObject({
      id: 7,
      deviceLabel: 'Mac · Chrome 121',
      maskedIp: '92.184.x.x',
      lastSeenIsCreation: false,
      isCurrent: true,
    });
  });

  it('falls back to createdAt when the token has never been used', async () => {
    const pending = store.load();
    flushList([session({ lastUsedAt: null })]);
    await pending;

    expect(store.sessions()[0].lastSeenIsCreation).toBe(true);
  });

  it('survives a null user agent and a null ip', async () => {
    const pending = store.load();
    flushList([session({ userAgent: null, ipAddress: null })]);
    await pending;

    expect(store.sessions()[0]).toMatchObject({
      deviceLabel: 'Appareil inconnu',
      maskedIp: 'IP inconnue',
    });
  });

  it('records an error state when the list cannot be fetched', async () => {
    const pending = store.load();
    http
      .expectOne((r) => r.url.endsWith(SESSIONS_URL))
      .flush({ code: 'E_BOOM', message: 'nope' }, { status: 500, statusText: 'Server Error' });
    await pending;

    expect(store.loading()).toBe('error');
    expect(store.loadError()).toBeTruthy();
  });

  it('does not refetch once loaded — load() is guarded', async () => {
    const first = store.load();
    flushList([session()]);
    await first;

    await store.load();
    http.expectNone((r) => r.url.endsWith(SESSIONS_URL));
    expect(store.loading()).toBe('loaded');
  });

  it('refresh() bypasses the load() guard', async () => {
    const first = store.load();
    flushList([session({ id: 1 }), session({ id: 2 })]);
    await first;

    const second = store.refresh();
    flushList([session({ id: 1 })]);
    await second;

    expect(store.sessions().map((s) => s.id)).toEqual([1]);
  });

  it('reloads after a successful revoke so the row really disappears', async () => {
    const first = store.load();
    flushList([session({ id: 1, isCurrent: true }), session({ id: 2 })]);
    await first;
    expect(store.sessions()).toHaveLength(2);

    const revoking = store.revoke(2);
    http
      .expectOne((r) => r.url.endsWith('/account/sessions/2') && r.method === 'DELETE')
      .flush(null, { status: 204, statusText: 'No Content' });
    // The reload is issued from the continuation after the DELETE resolves.
    await settle();
    flushList([session({ id: 1, isCurrent: true })]);
    await revoking;

    expect(store.sessions().map((s) => s.id)).toEqual([1]);
  });

  it('propagates a revoke failure to the caller and leaves the list untouched', async () => {
    const first = store.load();
    flushList([session({ id: 1, isCurrent: true })]);
    await first;

    const revoking = store.revoke(1);
    http
      .expectOne((r) => r.url.endsWith('/account/sessions/1') && r.method === 'DELETE')
      .flush(
        { error: { code: 'E_CANNOT_REVOKE_CURRENT_SESSION', message: 'nope' } },
        { status: 403, statusText: 'Forbidden' },
      );

    await expect(revoking).rejects.toBeTruthy();
    // A failed revoke must not trigger a reload — the list is left as-is.
    http.expectNone((r) => r.url.endsWith(SESSIONS_URL) && r.method === 'GET');
    expect(store.sessions().map((s) => s.id)).toEqual([1]);
  });
});
