import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { forkJoin, lastValueFrom } from 'rxjs';
import {
  PreferencesService,
  type ApiPreferableJob,
} from '#core/services/preferences/preferences-service';
import type { LoadingStatus } from '#core/models/global.model';

/** A job in the member's ranking, in order. */
export interface RankedJob {
  readonly id: number;
  readonly name: string;
}

interface PreferencesState {
  readonly loading: LoadingStatus;
  readonly loadError: string | null;
  readonly saving: boolean;
  readonly saveError: string | null;
  /** All jobs that exist, so the member can pick from them. */
  readonly allJobs: readonly ApiPreferableJob[];
  /** The ranking as last persisted — the baseline "dirty" is measured against. */
  readonly saved: readonly number[];
  /** The ranking currently being edited. */
  readonly draft: readonly number[];
}

const initialState: PreferencesState = {
  loading: 'init',
  loadError: null,
  saving: false,
  saveError: null,
  allJobs: [],
  saved: [],
  draft: [],
};

function sameOrder(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((id, index) => id === b[index]);
}

export const PreferencesStore = signalStore(
  { providedIn: 'root' },
  withState<PreferencesState>(initialState),
  withComputed((store) => {
    const byId = computed(() => new Map(store.allJobs().map((job) => [job.id, job])));

    return {
      /** The draft, resolved to jobs, in rank order. */
      ranked: computed<RankedJob[]>(() =>
        store
          .draft()
          .map((id) => byId().get(id))
          .filter((job): job is ApiPreferableJob => job !== undefined)
          .map((job) => ({ id: job.id, name: job.name })),
      ),
      /** Jobs not yet ranked, alphabetical. */
      available: computed<RankedJob[]>(() => {
        const chosen = new Set(store.draft());
        return store
          .allJobs()
          .filter((job) => !chosen.has(job.id))
          .map((job) => ({ id: job.id, name: job.name }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }),
      dirty: computed<boolean>(() => !sameOrder(store.draft(), store.saved())),
    };
  }),
  withMethods((store, svc = inject(PreferencesService)) => {
    async function fetch(): Promise<void> {
      patchState(store, { loading: 'loading', loadError: null });
      try {
        const { jobs, mine } = await lastValueFrom(
          forkJoin({ jobs: svc.getJobs(), mine: svc.getMine() }),
        );
        const order = [...mine]
          .sort((a, b) => a.preferenceRank - b.preferenceRank)
          .map((pref) => pref.jobId);
        patchState(store, {
          loading: 'loaded',
          allJobs: jobs,
          saved: order,
          draft: order,
        });
      } catch {
        patchState(store, {
          loading: 'error',
          loadError: 'Impossible de charger les postes.',
        });
      }
    }

    return {
      async load(): Promise<void> {
        if (store.loading() === 'loaded' || store.loading() === 'loading') return;
        await fetch();
      },

      /** Force a refetch, bypassing the cache guard. */
      refresh: fetch,

      add(jobId: number): void {
        if (store.draft().includes(jobId)) return;
        patchState(store, { draft: [...store.draft(), jobId], saveError: null });
      },

      remove(jobId: number): void {
        patchState(store, {
          draft: store.draft().filter((id) => id !== jobId),
          saveError: null,
        });
      },

      /** Move a job one place towards rank 1, or one place away from it. */
      move(jobId: number, direction: -1 | 1): void {
        const draft = [...store.draft()];
        const from = draft.indexOf(jobId);
        const to = from + direction;
        if (from === -1 || to < 0 || to >= draft.length) return;
        [draft[from], draft[to]] = [draft[to], draft[from]];
        patchState(store, { draft, saveError: null });
      },

      reset(): void {
        patchState(store, { draft: [...store.saved()], saveError: null });
      },

      async save(): Promise<boolean> {
        patchState(store, { saving: true, saveError: null });
        try {
          const saved = await lastValueFrom(svc.saveMine(store.draft()));
          const order = [...saved]
            .sort((a, b) => a.preferenceRank - b.preferenceRank)
            .map((pref) => pref.jobId);
          patchState(store, { saving: false, saved: order, draft: order });
          return true;
        } catch {
          patchState(store, {
            saving: false,
            saveError: "Impossible d'enregistrer vos préférences.",
          });
          return false;
        }
      },

      clear(): void {
        patchState(store, initialState);
      },
    };
  }),
);
