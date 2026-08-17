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

export interface MemberAssignment {
  readonly eventId: number;
  readonly jobId: number;
  readonly jobName: string;
  readonly period: JobPeriod;
  readonly periodLabel: string;
  readonly shortPeriodLabel: string;
  readonly pointsDelta: number;
  readonly needed: number | null;
  readonly teammates: readonly ApiTeammate[];
}

interface MemberAssignmentsState {
  readonly status: LoadingStatus;
  readonly error: string | null;
  readonly assignments: readonly ApiMyAssignment[];
  readonly preferences: readonly ApiJobPreference[];
}

const initialState: MemberAssignmentsState = {
  status: 'init',
  error: null,
  assignments: [],
  preferences: [],
};

function periodOf(type: string): JobPeriod {
  return isJobPeriod(type) ? type : 'during';
}

const PERIOD_RANK = new Map(JOB_PERIODS.map((period, index) => [period, index] as const));

export const MemberAssignmentsStore = signalStore(
  { providedIn: 'root' },
  withState<MemberAssignmentsState>(initialState),
  withComputed((store) => {
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
    assignmentsFor(eventId: string | number): readonly MemberAssignment[] {
      return store.byEvent().get(Number(eventId)) ?? [];
    },

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
