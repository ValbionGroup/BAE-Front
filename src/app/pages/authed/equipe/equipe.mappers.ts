import {
  LucideEye,
  LucidePencil,
  LucidePlus,
  LucideShield,
  LucideTrash2,
  type LucideIconInput,
} from '@lucide/angular';
import type {
  ApiTeamLog,
  ApiTeamMember,
  ApiTeamPermission,
  ApiTeamRoleWithPermissions,
} from '#core/services/team/team-service';
import type {
  AuditEntry,
  AuditTone,
  PermsMatrix,
  PermsRoleColumn,
  PermsRow,
  PermState,
  TeamMemberRow,
} from './equipe.types';

const MINUTE_MS = 60_000;
const HOUR_MS = 60 * MINUTE_MS;
const DAY_MS = 24 * HOUR_MS;

/** A member is flagged "recently active" under this threshold. Documented, not guessed. */
export const RECENT_ACTIVITY_MS = 5 * MINUTE_MS;

/**
 * Number of audit rows kept in the Audit tab. `GET /logs` is paginated — 50 rows by
 * default, 200 max (`LogsController`) — so this trims that already-bounded recent
 * window further; it is not a slice of the full log table.
 */
export const AUDIT_LIMIT = 20;

function parseIso(value: string | null): number | null {
  if (!value) return null;
  const ms = Date.parse(value);
  return Number.isNaN(ms) ? null : ms;
}

/** "Il y a 2 min" / "Il y a 3 h" / "Hier" / "12/07/26". */
export function relativeLabel(iso: string | null, now: number): string | null {
  const ms = parseIso(iso);
  return ms === null ? null : relativeLabelFromMs(ms, now);
}

function relativeLabelFromMs(ms: number, now: number): string {
  const delta = now - ms;
  if (delta < MINUTE_MS) return "À l'instant";
  if (delta < HOUR_MS) return `Il y a ${Math.floor(delta / MINUTE_MS)} min`;
  if (delta < DAY_MS) return `Il y a ${Math.floor(delta / HOUR_MS)} h`;
  if (delta < 2 * DAY_MS) return 'Hier';
  return new Date(ms).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

/** "14:32" today, "Hier 14:32", else "08/07 14:32". */
export function timestampLabel(iso: string | null, now: number): string {
  const ms = parseIso(iso);
  if (ms === null) return '—';
  const date = new Date(ms);
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const delta = now - ms;
  if (delta < DAY_MS && new Date(now).getDate() === date.getDate()) return time;
  if (delta < 2 * DAY_MS) return `Hier ${time}`;
  return `${date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })} ${time}`;
}

/**
 * Most recent log timestamp per user id, computed only over the `logs` array passed
 * in — which is `GET /logs`' bounded recent window (50 rows by default, 200 max;
 * `LogsController`), not the full table. On a busy instance most members will have no
 * entry here at all, not because they are inactive but because their last request
 * fell outside that window.
 * `Member` self-assigns its primary key from `User` (`@belongsTo(() => User, { foreignKey: 'id' })`),
 * so `member.id === user.id` and `logs.user_id` can be joined onto members directly.
 */
function lastActivityByUserId(logs: readonly ApiTeamLog[]): ReadonlyMap<number, number> {
  const map = new Map<number, number>();
  for (const log of logs) {
    if (log.userId === null) continue;
    const ms = parseIso(log.createdAt);
    if (ms === null) continue;
    const current = map.get(log.userId);
    if (current === undefined || ms > current) map.set(log.userId, ms);
  }
  return map;
}

export function toMemberRows(
  members: readonly ApiTeamMember[],
  logs: readonly ApiTeamLog[],
  now: number,
): TeamMemberRow[] {
  const lastActivity = lastActivityByUserId(logs);
  return members
    .map((member) => {
      const activityMs = lastActivity.get(member.id) ?? null;
      return {
        id: member.id,
        nom: `${member.firstName} ${member.lastName}`.trim(),
        // `role` is a preloaded object: reading it directly would print [object Object].
        role: member.role?.name ?? null,
        points: member.points,
        scope: null, // NO API SOURCE
        promo: null, // NO API SOURCE
        lastActivityLabel: activityMs === null ? null : relativeLabelFromMs(activityMs, now),
        recentlyActive: activityMs !== null && now - activityMs < RECENT_ACTIVITY_MS,
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}

export function toPermsMatrix(
  roles: readonly ApiTeamRoleWithPermissions[],
  permissions: readonly ApiTeamPermission[],
  members: readonly ApiTeamMember[],
): PermsMatrix {
  const memberCounts = new Map<number, number>();
  for (const member of members) {
    if (member.roleId === null) continue;
    memberCounts.set(member.roleId, (memberCounts.get(member.roleId) ?? 0) + 1);
  }

  const sorted = [...roles].sort((a, b) => a.name.localeCompare(b.name, 'fr') || a.id - b.id);

  const columns: PermsRoleColumn[] = sorted.map((role) => ({
    id: role.id,
    name: role.name,
    memberCount: memberCounts.get(role.id) ?? 0,
  }));

  const grantedByColumn = sorted.map(
    (role) => new Set(role.permissions.map((entry) => entry.permission)),
  );

  const rows: PermsRow[] = [...permissions]
    .sort((a, b) => a.permission.localeCompare(b.permission, 'fr'))
    .map((permission) => ({
      permission: permission.permission,
      cells: grantedByColumn.map((granted): PermState =>
        granted.has(permission.permission) ? 'granted' : 'none',
      ),
    }));

  return { roles: columns, rows };
}

function auditTone(level: string): AuditTone {
  if (level === 'error') return 'danger';
  if (level === 'warning') return 'warn';
  if (level === 'info') return 'blue';
  return 'neutral';
}

function auditIcon(method: string): LucideIconInput {
  if (method === 'DELETE') return LucideTrash2;
  if (method === 'POST') return LucidePlus;
  if (method === 'PUT' || method === 'PATCH') return LucidePencil;
  if (method === 'GET') return LucideEye;
  return LucideShield;
}

export function toAuditEntries(
  logs: readonly ApiTeamLog[],
  members: readonly ApiTeamMember[],
  now: number,
  limit = AUDIT_LIMIT,
): AuditEntry[] {
  const nameByUserId = new Map<number, string>(
    members.map((member) => [member.id, `${member.firstName} ${member.lastName}`.trim()]),
  );

  return [...logs]
    .sort((a, b) => (parseIso(b.createdAt) ?? 0) - (parseIso(a.createdAt) ?? 0))
    .slice(0, limit)
    .map((log) => {
      const status = log.meta?.status;
      return {
        id: log.id,
        who:
          (log.userId !== null ? nameByUserId.get(log.userId) : undefined) ??
          log.user?.email ??
          'Système',
        a: `${log.method} `,
        em: log.url,
        s: typeof status === 'number' ? ` → ${status}` : null,
        when: timestampLabel(log.createdAt, now),
        icon: auditIcon(log.method),
        c: auditTone(log.level),
      };
    });
}
