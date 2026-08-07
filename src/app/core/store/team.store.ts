import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { catchError, forkJoin, lastValueFrom, map, of, type Observable } from 'rxjs';
import {
  TeamService,
  type ApiTeamLog,
  type ApiTeamMember,
  type ApiTeamPermission,
  type ApiTeamRoleWithPermissions,
} from '#core/services/team/team-service';
import type { LoadingStatus } from '#core/models/global.model';

type Settled<T> = { readonly ok: true; readonly value: T } | { readonly ok: false };

/**
 * Isolates a stream so a single failing endpoint cannot cancel the whole `forkJoin`.
 * forkJoin propagates the first error and unsubscribes every sibling, which is exactly
 * how the coordination page went blank when one of its endpoints 404'd.
 */
function settle<T>(source: Observable<T>): Observable<Settled<T>> {
  return source.pipe(
    map((value) => ({ ok: true, value }) as const),
    catchError(() => of({ ok: false } as const)),
  );
}

/** Per-section error messages, so one dead endpoint only blanks its own card. */
export interface TeamSectionErrors {
  members: string | null;
  roles: string | null;
  permissions: string | null;
  logs: string | null;
}

interface TeamState {
  loading: LoadingStatus;
  loadError: string | null;
  members: ApiTeamMember[];
  roles: ApiTeamRoleWithPermissions[];
  permissions: ApiTeamPermission[];
  logs: ApiTeamLog[];
  errors: TeamSectionErrors;
}

const NO_ERRORS: TeamSectionErrors = {
  members: null,
  roles: null,
  permissions: null,
  logs: null,
};

const initialState: TeamState = {
  loading: 'init',
  loadError: null,
  members: [],
  roles: [],
  permissions: [],
  logs: [],
  errors: NO_ERRORS,
};

export const TeamStore = signalStore(
  { providedIn: 'root' },
  withState<TeamState>(initialState),
  withMethods((store, svc = inject(TeamService)) => ({
    async load(): Promise<void> {
      if (store.loading() === 'loaded' || store.loading() === 'loading') return;
      patchState(store, { loading: 'loading', loadError: null, errors: NO_ERRORS });

      const result = await lastValueFrom(
        forkJoin({
          members: settle(svc.getMembers()),
          roles: settle(svc.getRoles()),
          permissions: settle(svc.getPermissions()),
          logs: settle(svc.getLogs()),
        }),
      );

      const errors: TeamSectionErrors = {
        members: result.members.ok ? null : 'Impossible de charger les membres.',
        roles: result.roles.ok ? null : 'Impossible de charger les rôles.',
        permissions: result.permissions.ok ? null : 'Impossible de charger les permissions.',
        logs: result.logs.ok ? null : "Impossible de charger le journal d'activité.",
      };
      const allFailed = Object.values(errors).every((message) => message !== null);

      patchState(store, {
        loading: allFailed ? 'error' : 'loaded',
        loadError: allFailed ? "Impossible de charger les données de l'équipe." : null,
        members: result.members.ok ? result.members.value : [],
        roles: result.roles.ok ? result.roles.value : [],
        permissions: result.permissions.ok ? result.permissions.value : [],
        logs: result.logs.ok ? result.logs.value : [],
        errors,
      });
    },

    /** Forces a refetch on the next `load()` (nothing mutates team data yet). */
    reset(): void {
      patchState(store, initialState);
    },
  })),
);
