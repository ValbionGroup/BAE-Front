import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { LogsService, type ApiLog } from '#core/services/logs/logs-service';
import type { LoadingStatus } from '#core/models/global.model';
import { ActivityItem } from './models';

/**
 * "Activité de l'équipe" panel.
 *
 * Source: `GET /v1/logs` — the only activity trail the backend keeps. Rows are
 * HTTP request logs, so only write requests (POST/PUT/PATCH/DELETE) are shown;
 * GETs are read noise, not activity.
 *
 * ⚠️ `ActivityItem.who` is the *user* account, and `users` carries only
 * `cas_id` + `email` — no display name. `members.first_name` / `last_name`
 * exist on another table with no join exposed on `/v1/logs`, so the feed shows
 * the CAS login (or the email local part, or "Système" for unauthenticated
 * requests) rather than a real name.
 *
 * ⚠️ `/v1/logs` has no pagination, ordering or limit parameter: it returns the
 * whole table (~500 rows / 1.3 MB today, `meta` included) on every call. The
 * slice below is client-side.
 */
const FEED_SIZE = 6;

const VERBS: Readonly<Record<string, string>> = {
  POST: 'a créé',
  PUT: 'a modifié',
  PATCH: 'a modifié',
  DELETE: 'a supprimé',
};

/** 'error' / 'warning' come from the HTTP status; anything else is a success. */
const OUTCOMES: Readonly<Record<string, string>> = {
  error: '— échec serveur',
  warning: '— requête refusée',
};

function who(log: ApiLog): string {
  const user = log.user;
  if (!user) return 'Système';
  return user.casId ?? user.email.split('@')[0];
}

function when(createdAt: string | null): string {
  if (!createdAt) return '';
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

function toActivityItem(log: ApiLog): ActivityItem {
  return {
    who: who(log),
    what: VERBS[log.method] ?? 'a appelé',
    emphasis: log.url,
    tail: OUTCOMES[log.level],
    when: when(log.createdAt),
  };
}

function sortKey(log: ApiLog): number {
  const time = log.createdAt ? new Date(log.createdAt).getTime() : Number.NaN;
  return Number.isNaN(time) ? log.id : time;
}

interface ActivityFeedState {
  readonly status: LoadingStatus;
  readonly error: string | null;
  readonly data: readonly ActivityItem[];
}

const initialState: ActivityFeedState = { status: 'init', error: null, data: [] };

export const ActivityFeedStore = signalStore(
  { providedIn: 'root' },
  withState<ActivityFeedState>(initialState),
  withComputed((store) => ({
    loading: computed<boolean>(() => {
      const status = store.status();
      return status === 'init' || status === 'loading';
    }),
  })),
  withMethods((store, svc = inject(LogsService)) => ({
    async load(): Promise<void> {
      if (store.status() === 'loaded' || store.status() === 'loading') return;
      patchState(store, { status: 'loading', error: null });
      try {
        const logs = await lastValueFrom(svc.getAll());
        const data = logs
          .filter((log) => log.method !== 'GET')
          .sort((a, b) => sortKey(b) - sortKey(a))
          .slice(0, FEED_SIZE)
          .map(toActivityItem);
        patchState(store, { status: 'loaded', data });
      } catch {
        patchState(store, {
          status: 'error',
          error: "Impossible de charger l'activité.",
          data: [],
        });
      }
    },

    clear(): void {
      patchState(store, initialState);
    },
  })),
);
