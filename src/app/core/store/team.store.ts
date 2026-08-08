import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
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

/**
 * `apiEnvelopeInterceptor` réduit le corps d'erreur à `{ code, message }`.
 * Le message vient de l'API parce que le 409 anti-verrouillage explique quoi
 * faire — un texte codé en dur ne le pourrait pas.
 */
function messageOf(error: unknown): string {
  const body = (error as HttpErrorResponse | undefined)?.error as { message?: string } | undefined;
  return body?.message ?? 'Impossible de mettre à jour les permissions du rôle.';
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
  /** Rôles dont un PUT est en vol. Chaque requête porte la liste complète :
   *  deux écritures concurrentes sur le même rôle s'écraseraient. */
  savingRoleIds: number[];
  permissionsError: string | null;
  /** Role the current `permissionsError` describes; lets a retry on that same
   *  role clear it without touching an unrelated role's still-unseen error. */
  permissionsErrorRoleId: number | null;
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
  savingRoleIds: [],
  permissionsError: null,
  permissionsErrorRoleId: null,
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

    async setRolePermission(roleId: number, permission: string, granted: boolean): Promise<void> {
      if (store.savingRoleIds().includes(roleId)) return;

      // A stale error only ever names one role; a fresh attempt on that same
      // role is the signal that it's no longer describing the current state.
      if (store.permissionsErrorRoleId() === roleId) {
        patchState(store, { permissionsError: null, permissionsErrorRoleId: null });
      }

      const before = store.roles();
      const target = before.find((role) => role.id === roleId);
      if (!target) return;

      const alreadyGranted = target.permissions.some((entry) => entry.permission === permission);
      const next = granted
        ? alreadyGranted
          ? target.permissions
          : [...target.permissions, { permission, createdAt: null, updatedAt: null }]
        : target.permissions.filter((entry) => entry.permission !== permission);

      patchState(store, {
        roles: before.map((role) => (role.id === roleId ? { ...role, permissions: next } : role)),
        savingRoleIds: [...store.savingRoleIds(), roleId],
      });

      try {
        const saved = await lastValueFrom(
          svc.updateRolePermissions(
            roleId,
            next.map((entry) => entry.permission),
          ),
        );
        patchState(store, {
          roles: store.roles().map((role) => (role.id === roleId ? saved : role)),
        });
      } catch (error) {
        // Only `target` (this role's pre-click value) is restored, merged into
        // live state: a wholesale `before` would also revert any other role
        // whose write landed while this one was in flight.
        patchState(store, {
          roles: store.roles().map((role) => (role.id === roleId ? target : role)),
          permissionsError: messageOf(error),
          permissionsErrorRoleId: roleId,
        });
      } finally {
        patchState(store, {
          savingRoleIds: store.savingRoleIds().filter((id) => id !== roleId),
        });
      }
    },

    /** Forces a refetch on the next `load()`. */
    reset(): void {
      patchState(store, initialState);
    },
  })),
);
