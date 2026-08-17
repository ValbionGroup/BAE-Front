/**
 * The three moments of a soirée that job assignments are now scoped to:
 * `before` (préparation), `during` (soirée), `after` (nettoyage). A member
 * may hold at most one job per period on a given event — see D1 in
 * `docs/plans/periodes-points-presence.md` and the backend's
 * `matching_service.ts`.
 *
 * Lives in `core/models/` — not under `core/services/coordination/` — because
 * three separate features consume it independently: the coordination page,
 * "mes présences", and the home page. Declaring it once here means none of
 * them redeclares the period vocabulary locally.
 */
export const JOB_PERIODS = ['before', 'during', 'after'] as const;

export type JobPeriod = (typeof JOB_PERIODS)[number];

/**
 * Interface labels, in the same chronological order as `JOB_PERIODS`. This is
 * the single source of truth for how a period is worded — never redeclare
 * these strings at a call site.
 */
export const JOB_PERIOD_LABELS: Readonly<Record<JobPeriod, string>> = {
  before: 'Préparation',
  during: 'Soirée',
  after: 'Nettoyage',
};

/** Compact labels for narrow table columns. */
export const JOB_PERIOD_SHORT_LABELS: Readonly<Record<JobPeriod, string>> = {
  before: 'Prépa',
  during: 'Soirée',
  after: 'Ménage',
};

/**
 * Runtime guard for a period value coming off the wire. The column has no
 * database check constraint — only application-level meaning — so a string
 * the front doesn't recognize (the enum grew server-side, a stale client…)
 * must degrade gracefully. Callers should log and fall back to `'during'`,
 * never render `undefined` or throw.
 */
export function isJobPeriod(value: unknown): value is JobPeriod {
  return typeof value === 'string' && (JOB_PERIODS as readonly string[]).includes(value);
}
