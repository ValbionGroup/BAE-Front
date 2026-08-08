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

  const ROLE = {
    id: 1,
    name: 'Tresorier',
    createdAt: null,
    updatedAt: null,
    permissions: [{ permission: 'stock:read', createdAt: null, updatedAt: null }],
  };

  async function loadWith(role = ROLE): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/members`).flush([MEMBER]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([role]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([{ permission: 'stock:read' }]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await loaded;
  }

  it('sends the complete list when a permission is granted', async () => {
    await loadWith();

    const saving = store.setRolePermission(1, 'log:read', true);
    const req = httpMock.expectOne(`${baseUrl}/roles/1/permissions`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ permissions: ['stock:read', 'log:read'] });

    req.flush({
      ...ROLE,
      permissions: [
        { permission: 'stock:read', createdAt: null, updatedAt: null },
        { permission: 'log:read', createdAt: null, updatedAt: null },
      ],
    });
    await saving;

    expect(store.roles()[0].permissions.map((p) => p.permission)).toEqual([
      'stock:read',
      'log:read',
    ]);
    expect(store.savingRoleIds()).toEqual([]);
  });

  it('restores the previous state and surfaces the API message on failure', async () => {
    await loadWith();

    const saving = store.setRolePermission(1, 'stock:read', false);
    httpMock
      .expectOne(`${baseUrl}/roles/1/permissions`)
      .flush(
        { code: 'E_RBAC_LOCKOUT', message: 'Accordez d’abord role:write à un rôle occupé.' },
        { status: 409, statusText: 'Conflict' },
      );
    await saving;

    expect(store.roles()[0].permissions.map((p) => p.permission)).toEqual(['stock:read']);
    expect(store.permissionsError()).toBe('Accordez d’abord role:write à un rôle occupé.');
  });

  it('ignores a second write while one is in flight for the same role', async () => {
    await loadWith();

    const first = store.setRolePermission(1, 'log:read', true);
    await store.setRolePermission(1, 'supplier:read', true);

    const req = httpMock.expectOne(`${baseUrl}/roles/1/permissions`);
    req.flush({ ...ROLE, permissions: [] });
    await first;
  });

  it("keeps another role's confirmed write when a different role's write fails", async () => {
    const roleB = { id: 2, name: 'Secretaire', createdAt: null, updatedAt: null, permissions: [] };
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/members`).flush([MEMBER]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([ROLE, roleB]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([{ permission: 'stock:read' }]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await loaded;

    const failing = store.setRolePermission(1, 'log:read', true);
    const succeeding = store.setRolePermission(2, 'stock:read', true);

    httpMock.expectOne(`${baseUrl}/roles/2/permissions`).flush({
      ...roleB,
      permissions: [{ permission: 'stock:read', createdAt: null, updatedAt: null }],
    });
    await succeeding;

    httpMock
      .expectOne(`${baseUrl}/roles/1/permissions`)
      .flush(
        { code: 'E_RBAC_LOCKOUT', message: 'Accordez d’abord role:write à un rôle occupé.' },
        { status: 409, statusText: 'Conflict' },
      );
    await failing;

    expect(
      store
        .roles()
        .find((role) => role.id === 2)!
        .permissions.map((p) => p.permission),
    ).toEqual(['stock:read']);
    expect(
      store
        .roles()
        .find((role) => role.id === 1)!
        .permissions.map((p) => p.permission),
    ).toEqual(['stock:read']);
  });

  it("clears a role's stale error once that same role succeeds again", async () => {
    await loadWith();

    const failing = store.setRolePermission(1, 'log:read', true);
    httpMock
      .expectOne(`${baseUrl}/roles/1/permissions`)
      .flush(
        { code: 'E_RBAC_LOCKOUT', message: 'Accordez d’abord role:write à un rôle occupé.' },
        { status: 409, statusText: 'Conflict' },
      );
    await failing;
    expect(store.permissionsError()).not.toBeNull();

    const retry = store.setRolePermission(1, 'log:read', true);
    httpMock.expectOne(`${baseUrl}/roles/1/permissions`).flush({
      ...ROLE,
      permissions: [
        { permission: 'stock:read', createdAt: null, updatedAt: null },
        { permission: 'log:read', createdAt: null, updatedAt: null },
      ],
    });
    await retry;

    expect(store.permissionsError()).toBeNull();
    expect(store.permissionsErrorRoleId()).toBeNull();
  });

  it("leaves another role's unseen error in place after a different role's success", async () => {
    const roleB = { id: 2, name: 'Secretaire', createdAt: null, updatedAt: null, permissions: [] };
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/members`).flush([MEMBER]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([ROLE, roleB]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([{ permission: 'stock:read' }]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await loaded;

    const failing = store.setRolePermission(1, 'log:read', true);
    httpMock
      .expectOne(`${baseUrl}/roles/1/permissions`)
      .flush(
        { code: 'E_RBAC_LOCKOUT', message: 'Accordez d’abord role:write à un rôle occupé.' },
        { status: 409, statusText: 'Conflict' },
      );
    await failing;

    const succeeding = store.setRolePermission(2, 'stock:read', true);
    httpMock.expectOne(`${baseUrl}/roles/2/permissions`).flush({
      ...roleB,
      permissions: [{ permission: 'stock:read', createdAt: null, updatedAt: null }],
    });
    await succeeding;

    expect(store.permissionsError()).toBe('Accordez d’abord role:write à un rôle occupé.');
    expect(store.permissionsErrorRoleId()).toBe(1);
  });
});
