import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { forkJoin, lastValueFrom } from 'rxjs';
import {
  TeamService,
  type ApiTeamLog,
  type ApiTeamMember,
  type ApiTeamPermission,
  type ApiTeamRoleWithPermissions,
  type UpdateMemberPatch,
} from '#core/services/team/team-service';
import type { LoadingStatus } from '#core/models/global.model';
import { messageOf, settle, type PageMetadata } from '@bae/ui';

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
  savingRoleIds: number[];
  permissionsError: string | null;
  permissionsErrorRoleId: number | null;
  savingMemberIds: number[];
  memberError: string | null;
  memberErrorId: number | null;
  logsPage: PageMetadata | null;
  logsPaging: boolean;
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
  logsPage: null,
  logsPaging: false,
  errors: NO_ERRORS,
  savingRoleIds: [],
  permissionsError: null,
  permissionsErrorRoleId: null,
  savingMemberIds: [],
  memberError: null,
  memberErrorId: null,
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
        logs: result.logs.ok ? result.logs.value.rows : [],
        logsPage: result.logs.ok ? result.logs.value.pagination : null,
        errors,
      });
    },

    async goToLogsPage(page: number): Promise<void> {
      if (store.logsPaging() || page < 1) return;

      const pagination = store.logsPage();
      if (pagination && (page > pagination.lastPage || page === pagination.currentPage)) return;

      patchState(store, { logsPaging: true });
      const result = await lastValueFrom(settle(svc.getLogs(page)));
      patchState(store, {
        logsPaging: false,
        ...(result.ok
          ? { logs: result.value.rows, logsPage: result.value.pagination }
          : {
              errors: { ...store.errors(), logs: 'Impossible de charger cette page du journal.' },
            }),
      });
    },

    async setRolePermission(roleId: number, permission: string, granted: boolean): Promise<void> {
      if (store.savingRoleIds().includes(roleId)) return;

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
        patchState(store, {
          roles: store.roles().map((role) => (role.id === roleId ? target : role)),
          permissionsError: messageOf(
            error,
            'Impossible de mettre à jour les permissions du rôle.',
          ),
          permissionsErrorRoleId: roleId,
        });
      } finally {
        patchState(store, {
          savingRoleIds: store.savingRoleIds().filter((id) => id !== roleId),
        });
      }
    },

    async updateMember(id: number, patch: UpdateMemberPatch): Promise<void> {
      if (store.savingMemberIds().includes(id)) return;

      if (store.memberErrorId() === id) {
        patchState(store, { memberError: null, memberErrorId: null });
      }

      const target = store.members().find((member) => member.id === id);
      if (!target) {
        patchState(store, {
          memberError: 'Ce membre a été supprimé entre-temps.',
          memberErrorId: id,
        });
        return;
      }

      const patchedUser =
        patch.firstName === undefined && patch.lastName === undefined
          ? target.user
          : {
              id: target.user?.id ?? target.id,
              email: target.user?.email ?? '',
              firstName: patch.firstName ?? target.user?.firstName ?? null,
              lastName: patch.lastName ?? target.user?.lastName ?? null,
            };

      const optimistic = {
        ...target,
        user: patchedUser,
        ...(patch.roleId !== undefined
          ? {
              roleId: patch.roleId,
              role:
                patch.roleId === null
                  ? null
                  : (store.roles().find((role) => role.id === patch.roleId) ?? target.role),
            }
          : {}),
      };

      patchState(store, {
        members: store.members().map((member) => (member.id === id ? optimistic : member)),
        savingMemberIds: [...store.savingMemberIds(), id],
      });

      try {
        const saved = await lastValueFrom(svc.updateMember(id, patch));
        patchState(store, {
          members: store.members().map((member) => (member.id === id ? saved : member)),
        });
      } catch (error) {
        patchState(store, {
          members: store.members().map((member) => (member.id === id ? target : member)),
          memberError: messageOf(error, 'Impossible de modifier ce membre.'),
          memberErrorId: id,
        });
      } finally {
        patchState(store, {
          savingMemberIds: store.savingMemberIds().filter((entry) => entry !== id),
        });
      }
    },

    async deleteMember(id: number): Promise<void> {
      if (store.savingMemberIds().includes(id)) return;

      if (store.memberErrorId() === id) {
        patchState(store, { memberError: null, memberErrorId: null });
      }

      patchState(store, { savingMemberIds: [...store.savingMemberIds(), id] });

      try {
        await lastValueFrom(svc.deleteMember(id));
        patchState(store, {
          members: store.members().filter((member) => member.id !== id),
        });
      } catch (error) {
        patchState(store, {
          memberError: messageOf(error, 'Impossible de supprimer ce membre.'),
          memberErrorId: id,
        });
      } finally {
        patchState(store, {
          savingMemberIds: store.savingMemberIds().filter((entry) => entry !== id),
        });
      }
    },

    /** Forces a refetch on the next `load()`. */
    reset(): void {
      patchState(store, initialState);
    },
  })),
);
