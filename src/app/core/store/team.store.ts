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
import { messageOf, settle } from '#shared/utils/api-error';

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
  /** Membres dont une écriture est en vol, pour empêcher deux mutations
   *  concurrentes sur la même ligne de s'écraser. */
  savingMemberIds: number[];
  memberError: string | null;
  /** Membre que `memberError` décrit ; une nouvelle tentative sur ce membre
   *  l'efface sans toucher à l'erreur non vue d'un autre. */
  memberErrorId: number | null;
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
          permissionsError: messageOf(error, 'Impossible de mettre à jour les permissions du rôle.'),
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
        // Membre disparu du store entre-temps (supprimé depuis un autre
        // onglet pendant l'édition) : un retour muet laisserait `memberErrorId`
        // à sa valeur précédente, la modale lirait « pas d'erreur pour ce
        // membre » et se fermerait comme si l'écriture avait abouti.
        patchState(store, {
          memberError: 'Ce membre a été supprimé entre-temps.',
          memberErrorId: id,
        });
        return;
      }

      // Écriture optimiste : le rôle affiché suit le patch tant que la réponse
      // n'est pas là. `role` est recalculé localement pour que le badge change
      // tout de suite — le serveur renverra la relation rechargée.
      const optimistic = {
        ...target,
        ...(patch.firstName !== undefined ? { firstName: patch.firstName } : {}),
        ...(patch.lastName !== undefined ? { lastName: patch.lastName } : {}),
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
        // Seule cette ligne est restaurée, fusionnée dans l'état vivant : un
        // `before` global annulerait aussi l'écriture d'un autre membre qui a
        // abouti pendant que celle-ci était en vol.
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

    /**
     * Délibérément NON optimiste. Retirer la ligne puis la remettre sur un refus
     * produit un clignotement qui se lit comme un bug — or le refus n'est pas un
     * cas rare ici : deux des trois gardes du back (hiérarchie, auto-suppression)
     * se déclenchent sur des gestes que l'interface ne peut pas toujours prévoir.
     */
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
