import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { SessionsService } from '#core/services/sessions/sessions-service';
import type { LoadingStatus } from '#core/models/global.model';
import {
  maskIpAddress,
  parseUserAgent,
} from '#pages/authed/parametres/securite/session-format';
import type {
  ApiSession,
  SessionRow,
} from '#pages/authed/parametres/securite/sessions.types';

function relativeLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'date inconnue';
  return formatDistanceToNow(date, { addSuffix: true, locale: fr });
}

function toSessionRow(session: ApiSession): SessionRow {
  // `lastUsedAt` is null on a token that has been issued but never replayed;
  // `createdAt` is the honest fallback, flagged so the label can say so.
  const lastSeenIsCreation = session.lastUsedAt === null;
  const reference = session.lastUsedAt ?? session.createdAt;

  return {
    id: session.id,
    deviceLabel: parseUserAgent(session.userAgent),
    maskedIp: maskIpAddress(session.ipAddress),
    lastSeenLabel: relativeLabel(reference),
    lastSeenIsCreation,
    isCurrent: session.isCurrent,
  };
}

interface SessionsState {
  loading: LoadingStatus;
  loadError: string | null;
  sessions: SessionRow[];
}

const initialState: SessionsState = {
  loading: 'init',
  loadError: null,
  sessions: [],
};

export const SessionsStore = signalStore(
  { providedIn: 'root' },
  withState<SessionsState>(initialState),
  withMethods((store, svc = inject(SessionsService)) => {
    /**
     * Unguarded fetch, shared by `load()` and `refresh()`.
     *
     * Declaring it in the closure — rather than having `revoke()` call the
     * public `load()` — is what makes a post-revoke reload actually happen:
     * `load()` returns early once `loading === 'loaded'`, which is exactly the
     * state the store is in after a successful revoke.
     */
    async function fetch(status: LoadingStatus): Promise<void> {
      patchState(store, { loading: status, loadError: null });
      try {
        const sessions = await lastValueFrom(svc.getAll());
        patchState(store, { loading: 'loaded', sessions: sessions.map(toSessionRow) });
      } catch {
        patchState(store, {
          loading: 'error',
          loadError: 'Impossible de charger les sessions actives.',
        });
      }
    }

    return {
      /** Called from the page's `ngOnInit`; a no-op once the data is in. */
      async load(): Promise<void> {
        if (store.loading() === 'loaded' || store.loading() === 'loading') return;
        await fetch('loading');
      },

      /**
       * Explicit reload that bypasses the `load()` guard. Uses `refreshing`
       * rather than `loading` so the panel keeps rendering the current list
       * instead of collapsing back to skeletons.
       */
      async refresh(): Promise<void> {
        await fetch('refreshing');
      },

      /**
       * Revokes a session, then reloads so the row really disappears.
       *
       * The HTTP error is deliberately *not* swallowed: the page maps the API
       * error code (`E_CANNOT_REVOKE_CURRENT_SESSION`, `E_SESSION_NOT_FOUND`)
       * onto a toast, which needs the original failure.
       */
      async revoke(id: number): Promise<void> {
        await lastValueFrom(svc.revoke(id));
        await fetch('refreshing');
      },
    };
  }),
);
