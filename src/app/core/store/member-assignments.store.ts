import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { Store } from '@ngrx/store';
import { lastValueFrom } from 'rxjs';
import {
  CoordinationService,
  type ApiAssignment,
  type ApiEventJob,
  type ApiJob,
  type ApiMember,
  type ApiPreference,
} from '#core/services/coordination/coordination-service';
import { selectMember } from '#core/store/auth/auth.selector';
import {
  JOB_PERIODS,
  JOB_PERIOD_LABELS,
  JOB_PERIOD_SHORT_LABELS,
  isJobPeriod,
  type JobPeriod,
} from '#core/models/job-period.model';
import type { LoadingStatus } from '#core/models/global.model';

/**
 * The coordination payload every "what am I doing on this soirée?" screen needs,
 * fetched once.
 *
 * Extracted out of `home-data/role-assignment.store.ts` rather than generalised
 * in place. That store already held the raw payload for EVERY soirée — only its
 * `data` computed narrowed it to the next one — so the loading path was already
 * general; what was home-specific was the presentation. Widening it would have
 * left "mes présences" importing a store from `home-data/`, and would have hung
 * a second, unrelated public surface off a panel model. The split keeps a single
 * round trip (`CoordinationService.loadAll()`), which is the constraint that
 * actually mattered: no third loading path.
 *
 * Known over-fetch, inherited: `loadAll()` also pulls `/events` and
 * `/responses`, which nothing here reads.
 */

/** One `member_event_assigned_jobs` row of the logged-in member, resolved. */
export interface MemberAssignment {
  readonly eventId: number;
  readonly jobId: number;
  readonly jobName: string;
  readonly period: JobPeriod;
  /** « Préparation » / « Soirée » / « Nettoyage ». */
  readonly periodLabel: string;
  /** « Prépa » / « Soirée » / « Ménage », for narrow columns. */
  readonly shortPeriodLabel: string;
  /**
   * Priority credit this assignment moved (D5). Negative is normal and means
   * "you got what you asked for, it cost you priority" — never an error.
   */
  readonly pointsDelta: number;
}

interface MemberAssignmentsState {
  readonly status: LoadingStatus;
  readonly error: string | null;
  readonly assignments: readonly ApiAssignment[];
  readonly jobs: readonly ApiJob[];
  readonly eventJobs: readonly ApiEventJob[];
  readonly members: readonly ApiMember[];
  readonly preferences: readonly ApiPreference[];
}

const initialState: MemberAssignmentsState = {
  status: 'init',
  error: null,
  assignments: [],
  jobs: [],
  eventJobs: [],
  members: [],
  preferences: [],
};

/**
 * The moment a poste belongs to, tolerant of a value this build does not know.
 * `jobs.type` has no database check constraint, and a poste dropped from the
 * member's own list because of an unknown enum value would read as "you hold
 * nothing" — the exact opposite of the truth.
 */
function periodOf(job: { type: string } | undefined): JobPeriod {
  return job && isJobPeriod(job.type) ? job.type : 'during';
}

const PERIOD_RANK = new Map(JOB_PERIODS.map((period, index) => [period, index] as const));

export const MemberAssignmentsStore = signalStore(
  { providedIn: 'root' },
  withState<MemberAssignmentsState>(initialState),
  withComputed((store) => {
    const member = inject(Store).selectSignal(selectMember);

    /**
     * Every poste the logged-in member holds, indexed by soirée and ordered
     * préparation → soirée → nettoyage inside each one.
     */
    const byEvent = computed<ReadonlyMap<number, readonly MemberAssignment[]>>(() => {
      const memberId = member()?.id;
      const index = new Map<number, MemberAssignment[]>();
      if (memberId === undefined) return index;

      const jobsById = new Map(store.jobs().map((job) => [job.id, job] as const));

      for (const row of store.assignments()) {
        if (row.memberId !== memberId) continue;
        const job = jobsById.get(row.jobId);
        const period = periodOf(job);
        const bucket = index.get(row.eventId) ?? [];
        bucket.push({
          eventId: row.eventId,
          jobId: row.jobId,
          // A job deleted while an assignment still points at it must stay
          // visible: the member is still expected there.
          jobName: job?.name ?? `Poste #${row.jobId}`,
          period,
          periodLabel: JOB_PERIOD_LABELS[period],
          shortPeriodLabel: JOB_PERIOD_SHORT_LABELS[period],
          pointsDelta: row.pointsDelta,
        });
        index.set(row.eventId, bucket);
      }

      for (const bucket of index.values()) {
        bucket.sort((a, b) => PERIOD_RANK.get(a.period)! - PERIOD_RANK.get(b.period)!);
      }
      return index;
    });

    return {
      byEvent,

      loading: computed<boolean>(() => {
        const status = store.status();
        return status === 'init' || status === 'loading';
      }),
    };
  }),
  withMethods((store) => ({
    /**
     * Postes held on one soirée. `EventDetail.id` is a string front-side while
     * the coordination API keys on numbers — the conversion lives here so no
     * caller has to remember it.
     */
    assignmentsFor(eventId: string | number): readonly MemberAssignment[] {
      return store.byEvent().get(Number(eventId)) ?? [];
    },

    /** Sum of the soirée's `pointsDelta` (D5). Legitimately negative. */
    creditFor(eventId: string | number): number {
      return (store.byEvent().get(Number(eventId)) ?? []).reduce(
        (sum, assignment) => sum + assignment.pointsDelta,
        0,
      );
    },
  })),
  withMethods((store, svc = inject(CoordinationService)) => {
    async function fetchAll(): Promise<void> {
      try {
        const raw = await lastValueFrom(svc.loadAll());
        patchState(store, {
          status: 'loaded',
          error: null,
          assignments: raw.assignments,
          jobs: raw.jobs,
          eventJobs: raw.eventJobs,
          members: raw.members,
          preferences: raw.preferences,
        });
      } catch {
        patchState(store, { status: 'error', error: 'Impossible de charger vos affectations.' });
      }
    }

    return {
      async load(): Promise<void> {
        if (store.status() === 'loaded' || store.status() === 'loading') return;
        patchState(store, { status: 'loading', error: null });
        await fetchAll();
      },

      /**
       * Re-read unconditionally. Used after a 409 `E_PRESENCE_LOCKED_BY_ASSIGNMENT`:
       * the refusal proves the cached assignments are stale, and the screen has
       * to start showing the poste it did not know about.
       */
      async refresh(): Promise<void> {
        patchState(store, { status: 'refreshing', error: null });
        await fetchAll();
      },

      clear(): void {
        patchState(store, initialState);
      },
    };
  }),
);
