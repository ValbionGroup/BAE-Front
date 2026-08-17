import type { LucideIconInput } from '@lucide/angular';

/**
 * View models for the Équipe page.
 *
 * Several fields of the original mockup have NO source in the API. They are typed
 * nullable here on purpose so the template can render a neutral placeholder instead
 * of a fabricated value. Each one is flagged with `NO API SOURCE`.
 */

export interface TeamMemberRow {
  readonly id: number;
  /** `firstName + lastName` from `GET /members`. */
  readonly nom: string;
  /** `member.role.name` — the API returns an OBJECT, never a string. `null` when unassigned. */
  readonly role: string | null;
  /** `member.points` — real, and the only extra numeric attribute members carry. */
  readonly points: number;
  /**
   * NO API SOURCE. The mockup showed a per-role scope ("Paiements · Caisse"). Deriving it
   * from the role's permissions is out of scope for now, so this is always `null`.
   */
  readonly scope: string | null;
  /**
   * NO API SOURCE. The mockup showed a promotion ("4A · Alt."). The `members` table has
   * no year//status column. Always `null`.
   */
  readonly promo: string | null;
  /**
   * DERIVED, not native: most recent `logs.created_at` for this member within the
   * bounded window `GET /logs` returns (50 rows by default, 200 max; `LogsController`
   * paginates, it does not dump the table), joined on `member.id === user.id` (Member
   * self-assigns its PK from User). `null` both when the member never appears in that
   * window and when they were simply never logged — the two cases are indistinguishable
   * from here.
   */
  readonly lastActivityLabel: string | null;
  /**
   * DERIVED PROXY, not a presence signal: true when the member's most recent request log
   * *within that same bounded window* is under 5 minutes old. The API exposes no
   * session/online state, and on a busy instance the window can roll past a member's
   * last request before this ever sees it — so this under-reports, it does not lie.
   */
  readonly recentlyActive: boolean;
}

/** Une ligne est déjà une chaîne `resource:action` : l'état d'une case est binaire. */
export type PermState = 'granted' | 'none';

export interface PermsRow {
  /** `permission` string from `GET /permissions`, e.g. `stock:read`. It is the primary key. */
  readonly permission: string;
  /** One cell per role, same order as `PermsMatrix.roles`. */
  readonly cells: readonly PermState[];
}

export interface PermsRoleColumn {
  readonly id: number;
  readonly name: string;
  /** Number of members carrying this role, counted from `GET /members`. */
  readonly memberCount: number;
}

export interface PermsMatrix {
  readonly roles: readonly PermsRoleColumn[];
  readonly rows: readonly PermsRow[];
}

export type AuditTone = 'warn' | 'ok' | 'danger' | 'blue' | 'neutral';

export interface AuditEntry {
  readonly id: number;
  /** Member full name if the log user maps to a member, else the user email, else `Système`. */
  readonly who: string;
  /** HTTP method from `logs.method`. */
  readonly a: string;
  /** `logs.url`. */
  readonly em: string;
  /** ` → <status>` built from `logs.meta.status`, `null` when meta carries no status. */
  readonly s: string | null;
  /** Formatted `logs.created_at`. */
  readonly when: string;
  /** Derived from `logs.method`. */
  readonly icon: LucideIconInput;
  /** Derived from `logs.level` (`error` / `warning` / `info`). */
  readonly c: AuditTone;
}

/**
 * MOCK — kept intentionally.
 * No `invitations` table and no invitation endpoint exist on the backend. Per project rule,
 * a feature present in the front but missing in the back means the BACKEND is incomplete:
 * the UI stays in place with mock rows until `GET /invitations` ships.
 */
export interface Invitation {
  readonly mail: string;
  readonly role: string;
  readonly exp: string;
}
