import {
  relativeLabel,
  timestampLabel,
  toAuditEntries,
  toMemberRows,
  toPermsMatrix,
} from './equipe.mappers';
import type {
  ApiTeamLog,
  ApiTeamMember,
  ApiTeamPermission,
  ApiTeamRoleWithPermissions,
} from '#core/services/team/team-service';

const NOW = Date.parse('2026-08-05T12:00:00.000+00:00');

function member(over: Partial<ApiTeamMember> = {}): ApiTeamMember {
  return {
    id: 2,
    firstName: 'Tommy',
    lastName: 'Klein',
    roleId: 1,
    points: 3,
    createdAt: null,
    updatedAt: null,
    role: { id: 1, name: 'Finance', createdAt: null, updatedAt: null },
    ...over,
  };
}

function log(over: Partial<ApiTeamLog> = {}): ApiTeamLog {
  return {
    id: 1,
    level: 'info',
    message: 'GET /v1/events → 200 (13ms)',
    method: 'GET',
    url: '/v1/events',
    ip: '172.21.0.1',
    userId: 2,
    meta: { status: 200, durationMs: 13 },
    createdAt: '2026-08-05T11:58:00.000+00:00',
    user: { id: 2, casId: null, email: 'tommy@example.test', createdAt: null, updatedAt: null },
    ...over,
  };
}

describe('equipe mappers', () => {
  describe('relativeLabel', () => {
    it('returns null for a missing date', () => {
      expect(relativeLabel(null, NOW)).toBeNull();
    });

    it('formats minutes and hours', () => {
      expect(relativeLabel('2026-08-05T11:58:00.000+00:00', NOW)).toBe('Il y a 2 min');
      expect(relativeLabel('2026-08-05T09:00:00.000+00:00', NOW)).toBe('Il y a 3 h');
    });

    it('falls back to a date beyond 48h', () => {
      expect(relativeLabel('2026-07-08T09:00:00.000+00:00', NOW)).toBe('08/07/26');
    });
  });

  it('timestampLabel degrades to a dash without a date', () => {
    expect(timestampLabel(null, NOW)).toBe('—');
  });

  describe('toMemberRows', () => {
    it('reads role.name, never the role object', () => {
      const [row] = toMemberRows([member()], [], NOW);
      expect(row.role).toBe('Finance');
      expect(String(row.role)).not.toContain('[object Object]');
    });

    it('keeps a null role null instead of inventing one', () => {
      const [row] = toMemberRows([member({ role: null, roleId: null })], [], NOW);
      expect(row.role).toBeNull();
    });

    it('leaves unmapped mockup fields null', () => {
      const [row] = toMemberRows([member()], [], NOW);
      expect(row.scope).toBeNull();
      expect(row.promo).toBeNull();
    });

    it('derives last activity from the logs joined on member.id === user.id', () => {
      const [row] = toMemberRows([member()], [log()], NOW);
      expect(row.lastActivityLabel).toBe('Il y a 2 min');
      expect(row.recentlyActive).toBe(true);
    });

    it('reports no activity when the member never appears in the logs', () => {
      const [row] = toMemberRows([member({ id: 42 })], [log()], NOW);
      expect(row.lastActivityLabel).toBeNull();
      expect(row.recentlyActive).toBe(false);
    });

    it('does not mark an old log as recently active', () => {
      const rows = toMemberRows(
        [member()],
        [log({ createdAt: '2026-08-05T10:00:00.000+00:00' })],
        NOW,
      );
      expect(rows[0].recentlyActive).toBe(false);
      expect(rows[0].lastActivityLabel).toBe('Il y a 2 h');
    });
  });

  describe('toPermsMatrix', () => {
    const roles: ApiTeamRoleWithPermissions[] = [
      {
        id: 1,
        name: 'Finance',
        createdAt: null,
        updatedAt: null,
        permissions: [{ permission: 'stock:read', createdAt: null, updatedAt: null }],
      },
      { id: 2, name: 'Assembly', createdAt: null, updatedAt: null, permissions: [] },
    ];
    const permissions: ApiTeamPermission[] = [
      { permission: 'stock:read', createdAt: null, updatedAt: null },
      { permission: 'product:create', createdAt: null, updatedAt: null },
    ];

    it('builds real axes from roles and permissions', () => {
      const matrix = toPermsMatrix(roles, permissions, [member()]);
      expect(matrix.roles.map((r) => r.name)).toEqual(['Assembly', 'Finance']);
      expect(matrix.rows.map((r) => r.permission)).toEqual(['product:create', 'stock:read']);
    });

    it('counts members per role', () => {
      const matrix = toPermsMatrix(roles, permissions, [member(), member({ id: 3, roleId: 2 })]);
      expect(matrix.roles.find((r) => r.name === 'Finance')?.memberCount).toBe(1);
      expect(matrix.roles.find((r) => r.name === 'Assembly')?.memberCount).toBe(1);
    });

    it('grants a cell only where the role carries that exact permission', () => {
      const matrix = toPermsMatrix(roles, permissions, []);
      // Colonnes triées par nom : [Assembly, Finance].
      expect(matrix.rows.find((r) => r.permission === 'stock:read')?.cells).toEqual([
        'none',
        'granted',
      ]);
      expect(matrix.rows.find((r) => r.permission === 'product:create')?.cells).toEqual([
        'none',
        'none',
      ]);
    });
  });

  describe('toAuditEntries', () => {
    it('resolves the actor through the member list', () => {
      const [entry] = toAuditEntries([log()], [member()], NOW);
      expect(entry.who).toBe('Tommy Klein');
      expect(entry.a).toBe('GET ');
      expect(entry.em).toBe('/v1/events');
      expect(entry.s).toBe(' → 200');
    });

    it('falls back to the user email then to Système', () => {
      expect(toAuditEntries([log({ userId: 99 })], [], NOW)[0].who).toBe('tommy@example.test');
      expect(toAuditEntries([log({ userId: null, user: null })], [], NOW)[0].who).toBe('Système');
    });

    it('omits the status when meta carries none', () => {
      expect(toAuditEntries([log({ meta: null })], [], NOW)[0].s).toBeNull();
    });

    it('maps the level onto a tone', () => {
      expect(toAuditEntries([log({ level: 'error' })], [], NOW)[0].c).toBe('danger');
      expect(toAuditEntries([log({ level: 'warning' })], [], NOW)[0].c).toBe('warn');
      expect(toAuditEntries([log({ level: 'info' })], [], NOW)[0].c).toBe('blue');
    });

    it('sorts newest first and caps the list', () => {
      const logs = [
        log({ id: 1, createdAt: '2026-08-01T10:00:00.000+00:00' }),
        log({ id: 2, createdAt: '2026-08-04T10:00:00.000+00:00' }),
        log({ id: 3, createdAt: '2026-08-03T10:00:00.000+00:00' }),
      ];
      expect(toAuditEntries(logs, [], NOW, 2).map((e) => e.id)).toEqual([2, 3]);
    });
  });
});
