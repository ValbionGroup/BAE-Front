import { computed } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import type { LoadingStatus } from '#core/models/global.model';
import { ActivityItem } from './models';

/**
 * "Activité de l'équipe" panel — currently without a data source.
 *
 * This feed is a *domain* activity trail: who did what, in business terms
 * ("Léa a validé la précommande #128"). The template binds `who` to an avatar
 * and reads as a human sentence.
 *
 * It is deliberately NOT backed by `GET /v1/logs`. Those rows are HTTP request
 * logs — method, url, status — and rendering them here would produce
 * "lespiet a créé /v1/events", which looks like an activity feed without being
 * one. The backend has no domain-event system yet, so the panel stays in place
 * and says so, rather than showing a plausible-looking substitute.
 *
 * To wire this up, the backend needs an events/audit trail recording business
 * actions with an actor (`members`, not `users` — the latter has no display
 * name), a verb, a subject and a timestamp.
 */
interface ActivityFeedState {
  readonly status: LoadingStatus;
  readonly error: string | null;
  readonly data: readonly ActivityItem[];
}

const initialState: ActivityFeedState = { status: 'loaded', error: null, data: [] };

export const ActivityFeedStore = signalStore(
  { providedIn: 'root' },
  withState<ActivityFeedState>(initialState),
  withComputed((store) => ({
    loading: computed<boolean>(() => store.status() === 'loading'),
    /** Distinguishes "no backend for this yet" from "nothing happened today". */
    unavailable: computed<boolean>(() => store.data().length === 0),
  })),
  withMethods((store) => ({
    /**
     * No-op: kept so `home.ts` can call every panel's `load()` uniformly, and so
     * wiring a real endpoint later needs no change at the call site.
     */
    load(): void {},

    clear(): void {
      patchState(store, initialState);
    },
  })),
);
