import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { forkJoin, lastValueFrom } from 'rxjs';
import {
  CoordinationService,
  type ApiMyAssignment,
  type ApiTeammate,
} from '#core/services/coordination/coordination-service';
import {
  PreferencesService,
  type ApiJobPreference,
} from '#core/services/preferences/preferences-service';
import {
  JOB_PERIODS,
  JOB_PERIOD_LABELS,
  JOB_PERIOD_SHORT_LABELS,
  isJobPeriod,
  type JobPeriod,
} from '#core/models/job-period.model';
import type { LoadingStatus } from '#core/models/global.model';

/**
 * Ce dont tout écran « qu'est-ce que je fais sur cette soirée ? » a besoin.
 *
 * Extrait de `home-data/role-assignment.store.ts` plutôt que généralisé sur
 * place : ce store portait déjà la charge brute de TOUTES les soirées — seul son
 * computed `data` la réduisait à la prochaine — donc le chemin de chargement
 * était déjà général ; ce qui était propre à l'accueil, c'était la présentation.
 *
 * ⚠️ Ne consomme **plus** `CoordinationService.loadAll()`. Ce round-trip tire
 * `/jobs`, `/event-jobs`, `/responses` et `/preferences`, tous gardés par
 * `job:read` — une permission d'administration du catalogue des postes que seule
 * la coordination détient. Un `forkJoin` échouant en bloc au premier 403, le
 * panneau « mon rôle » ne se chargeait jamais pour un membre ordinaire.
 *
 * Il lit désormais deux routes personnelles, sans permission : mes affectations
 * déjà résolues, et mon classement. Ce que l'écran montre de non personnel — qui
 * d'autre est sur mon poste, combien il en faut — est calculé par le back, qui
 * le restreint aux postes que je tiens.
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
  /** Effectif attendu sur le poste, ou `null` quand il n'a pas été fixé. */
  readonly needed: number | null;
  /** Les autres membres affectés au même poste sur la même soirée. */
  readonly teammates: readonly ApiTeammate[];
}

interface MemberAssignmentsState {
  readonly status: LoadingStatus;
  readonly error: string | null;
  readonly assignments: readonly ApiMyAssignment[];
  /** Mon classement, trié par rang. Sert à dire de quel choix vient un poste. */
  readonly preferences: readonly ApiJobPreference[];
}

const initialState: MemberAssignmentsState = {
  status: 'init',
  error: null,
  assignments: [],
  preferences: [],
};

/**
 * The moment a poste belongs to, tolerant of a value this build does not know.
 * `jobs.type` has no database check constraint, and a poste dropped from the
 * member's own list because of an unknown enum value would read as "you hold
 * nothing" — the exact opposite of the truth.
 */
function periodOf(type: string): JobPeriod {
  return isJobPeriod(type) ? type : 'during';
}

const PERIOD_RANK = new Map(JOB_PERIODS.map((period, index) => [period, index] as const));

export const MemberAssignmentsStore = signalStore(
  { providedIn: 'root' },
  withState<MemberAssignmentsState>(initialState),
  withComputed((store) => {
    /**
     * Every poste the logged-in member holds, indexed by soirée and ordered
     * préparation → soirée → nettoyage inside each one.
     *
     * Plus de filtrage sur `memberId` : la route ne renvoie que les miennes, et
     * le jeton dit qui je suis. Le front n'a plus à le redemander.
     */
    const byEvent = computed<ReadonlyMap<number, readonly MemberAssignment[]>>(() => {
      const index = new Map<number, MemberAssignment[]>();

      for (const row of store.assignments()) {
        const period = periodOf(row.jobType);
        const bucket = index.get(row.eventId) ?? [];
        bucket.push({
          eventId: row.eventId,
          jobId: row.jobId,
          jobName: row.jobName,
          period,
          periodLabel: JOB_PERIOD_LABELS[period],
          shortPeriodLabel: JOB_PERIOD_SHORT_LABELS[period],
          pointsDelta: row.pointsDelta,
          needed: row.needed,
          teammates: row.teammates,
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
  withMethods(
    (
      store,
      coordination = inject(CoordinationService),
      preferences = inject(PreferencesService),
    ) => {
      async function fetchAll(): Promise<void> {
        try {
          // Deux routes personnelles, sans permission. Un `forkJoin` reste
          // légitime ici parce qu'aucune des deux ne peut être refusée à qui est
          // connecté — ce qui était précisément le défaut de `loadAll()`.
          const raw = await lastValueFrom(
            forkJoin({
              assignments: coordination.loadMyAssignments(),
              preferences: preferences.getMine(),
            }),
          );
          patchState(store, {
            status: 'loaded',
            error: null,
            assignments: raw.assignments,
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
    },
  ),
);
