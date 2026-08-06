import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TeamStore } from './team.store';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiTeamMember } from '#core/services/team/team-service';

const baseUrl = 'http://api.test/v1';

const MEMBER: ApiTeamMember = {
  id: 2,
  firstName: 'Tommy',
  lastName: 'Klein',
  roleId: 1,
  points: 0,
  createdAt: '2026-07-08T20:33:03.835+00:00',
  updatedAt: '2026-07-08T20:33:03.835+00:00',
  role: { id: 1, name: 'Finance', createdAt: null, updatedAt: null },
};

describe(TeamStore.name, () => {
  let store: InstanceType<typeof TeamStore>;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    store = TestBed.inject(TeamStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(store).toBeTruthy();
    expect(store.loading()).toBe('init');
  });

  it('does not auto-load on init', () => {
    httpMock.expectNone(`${baseUrl}/members`);
  });

  it('loads the four endpoints in parallel', async () => {
    const loaded = store.load();

    httpMock.expectOne(`${baseUrl}/members`).flush([MEMBER]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([{ id: 1, name: 'Finance' }]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([{ permission: 'stock:read' }]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await loaded;

    expect(store.loading()).toBe('loaded');
    expect(store.members().length).toBe(1);
    expect(store.roles().length).toBe(1);
    expect(store.permissions().length).toBe(1);
    expect(store.errors().members).toBeNull();
  });

  it('degrades gracefully when a single endpoint fails', async () => {
    const loaded = store.load();

    httpMock.expectOne(`${baseUrl}/members`).flush([MEMBER]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([]);
    httpMock
      .expectOne(`${baseUrl}/permissions`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await loaded;

    expect(store.loading()).toBe('loaded');
    expect(store.loadError()).toBeNull();
    expect(store.members().length).toBe(1);
    expect(store.errors().permissions).toBe('Impossible de charger les permissions.');
    expect(store.errors().members).toBeNull();
  });

  it('reports a global error only when every endpoint fails', async () => {
    const loaded = store.load();

    for (const path of ['members', 'roles', 'permissions', 'logs']) {
      httpMock.expectOne(`${baseUrl}/${path}`).flush(null, { status: 500, statusText: 'Nope' });
    }
    await loaded;

    expect(store.loading()).toBe('error');
    expect(store.loadError()).toBe("Impossible de charger les données de l'équipe.");
  });

  it('skips a second load once loaded (cache guard)', async () => {
    const loaded = store.load();
    for (const path of ['members', 'roles', 'permissions', 'logs']) {
      httpMock.expectOne(`${baseUrl}/${path}`).flush([]);
    }
    await loaded;

    await store.load();
    httpMock.expectNone(`${baseUrl}/members`);
  });
});
