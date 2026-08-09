import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  TemplateRef,
  computed,
  effect,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import {
  LucideDownload,
  LucideDynamicIcon,
  LucideEllipsis,
  LucidePencil,
  LucidePlus,
  LucideSearch,
  LucideTrash2,
} from '@lucide/angular';
import { Store } from '@ngrx/store';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { TeamStore } from '#core/store/team.store';
import { selectMember, selectPermissions } from '#core/store/auth/auth.selector';
import { DropdownService } from '#shared/components/dropdown/dropdown.service';
import { ModalService } from '#shared/components/modal/modal.service';
import { MemberEditModal } from '#shared/components/modal/member-edit-modal/member-edit-modal';
import { ToastService } from '#shared/components/toast/toast.service';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge, BadgeKind } from '#shared/components/ui/badge/badge';
import { Card } from '#shared/components/ui/card/card';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { Input } from '#shared/components/ui/input/input';
import { Skeleton } from '#shared/components/ui/skeleton/skeleton';
import { Checkbox } from '#shared/components/ui/checkbox/checkbox';
import { toAuditEntries, toMemberRows, toPermsMatrix } from './equipe.mappers';
import type { AuditEntry, Invitation } from './equipe.types';
import type { ApiTeamMember } from '#core/services/team/team-service';

@Component({
  selector: 'bfd-equipe',
  imports: [Btn, Badge, Card, Avatar, Input, Skeleton, Checkbox, LucideDynamicIcon],
  templateUrl: './equipe.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Equipe implements OnInit {
  private readonly pageHeader = inject(PageHeaderService);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');
  protected readonly store = inject(TeamStore);
  private readonly store$ = inject(Store);
  private readonly toast = inject(ToastService);
  private readonly dropdown = inject(DropdownService);
  private readonly modal = inject(ModalService);

  /** Reference instant for every relative label; refreshed on each load. */
  private readonly now = signal(Date.now());

  constructor() {
    this.pageHeader.set({
      title: 'Équipe BAE',
      subtitle: 'Chargement…',
      breadcrumb: ['Paramètres', 'Équipe BAE'],
      activeNavId: 'team',
    });
    // `set()` clears the action template, so the subtitle refresh and the action
    // re-push have to live in the same effect, in that order.
    effect(() => {
      this.pageHeader.set({
        title: 'Équipe BAE',
        subtitle: this.subtitle(),
        breadcrumb: ['Paramètres', 'Équipe BAE'],
        activeNavId: 'team',
      });
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  ngOnInit(): void {
    this.now.set(Date.now());
    void this.store.load();
  }

  protected readonly icDownload = LucideDownload;
  protected readonly icPlus = LucidePlus;
  protected readonly icSearch = LucideSearch;
  protected readonly icMore = LucideEllipsis;
  protected readonly icPencil = LucidePencil;
  protected readonly icTrash = LucideTrash2;

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;
  protected readonly errors = this.store.errors;

  protected readonly tabs = ['Membres', 'Rôles & permissions', 'Audit · activité', 'Invitations'];
  protected readonly activeTab = signal(0);

  protected readonly searchQuery = signal('');

  private readonly allMembers = computed(() =>
    toMemberRows(this.store.members(), this.store.logs(), this.now()),
  );

  protected readonly team = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    if (!q) return this.allMembers();
    return this.allMembers().filter(
      (m) => m.nom.toLowerCase().includes(q) || (m.role?.toLowerCase().includes(q) ?? false),
    );
  });

  protected readonly recentlyActiveCount = computed(
    () => this.allMembers().filter((m) => m.recentlyActive).length,
  );

  protected readonly perms = computed(() =>
    toPermsMatrix(this.store.roles(), this.store.permissions(), this.store.members()),
  );

  // `selectPermissions` et non `selectHasPermission(…)` : cette dernière fabrique
  // un sélecteur neuf à chaque appel, hors de portée de `overrideSelector`.
  private readonly permissions = this.store$.selectSignal(selectPermissions);

  protected readonly canWriteRoles = computed(() => this.permissions().includes('role:write'));

  /**
   * Miroir de l'invariant back : retirer `role:write` OU `role:read` au dernier
   * rôle occupé qui la porte verrouille l'administration pour tout le monde —
   * `role:read` conditionne aussi cette page, `GET /roles`, `GET /permissions` et
   * l'entrée de la sidebar. Le back refuse chacune par un 409 ; la case
   * correspondante est désactivée ici pour ne pas provoquer un refus évitable.
   * Une `Map` et non deux computed séparés : les deux permissions partagent
   * exactement la même règle, seul le nom change.
   */
  private static readonly RBAC_PROTECTED_PERMISSIONS: readonly string[] = [
    'role:read',
    'role:write',
  ];

  private readonly soleLivingHolderByPermission = computed(() => {
    const matrix = this.perms();
    const holders = new Map<string, number>();
    for (const permission of Equipe.RBAC_PROTECTED_PERMISSIONS) {
      const row = matrix.rows.find((r) => r.permission === permission);
      if (!row) continue;
      const living = matrix.roles.filter(
        (column, index) => column.memberCount > 0 && row.cells[index] === 'granted',
      );
      if (living.length === 1) holders.set(permission, living[0].id);
    }
    return holders;
  });

  protected readonly canWriteMembers = computed(() => this.permissions().includes('member:write'));

  private readonly currentMember = this.store$.selectSignal(selectMember);

  /** Permissions accordées par chaque rôle, indexées — la règle 1 comme la
   *  règle 2 se ramènent à une inclusion dans cet ensemble. */
  private readonly permissionsByRoleId = computed(() => {
    const byRole = new Map<number, ReadonlySet<string>>();
    for (const role of this.store.roles()) {
      byRole.set(role.id, new Set(role.permissions.map((entry) => entry.permission)));
    }
    return byRole;
  });

  private permissionsOfRole(roleId: number | null): ReadonlySet<string> {
    if (roleId === null) return new Set<string>();
    return this.permissionsByRoleId().get(roleId) ?? new Set<string>();
  }

  private includedInActor(other: ReadonlySet<string>): boolean {
    const actor = new Set(this.permissions());
    for (const permission of other) {
      if (!actor.has(permission)) return false;
    }
    return true;
  }

  /**
   * Miroir de la règle 1 côté back. Le front n'autorise rien : il évite un
   * refus que le serveur prononcerait de toute façon, et affiche le motif —
   * un bouton inerte sans explication se lit comme un bug.
   */
  protected canActOn(memberId: number): boolean {
    if (!this.canWriteMembers()) return false;
    const member = this.store.members().find((entry) => entry.id === memberId);
    if (!member) return false;
    return this.includedInActor(this.permissionsOfRole(member.roleId));
  }

  /** Miroir de la règle 2 : les rôles que l'utilisateur peut attribuer. */
  private readonly grantableRoleIds = computed(() =>
    this.store
      .roles()
      .filter((role) => this.includedInActor(this.permissionsOfRole(role.id)))
      .map((role) => role.id),
  );

  /**
   * Miroir de l'invariant anti-verrouillage, côté membres cette fois :
   * `soleLivingHolderByPermission()` désigne le rôle qui porte seul `role:read`
   * ou `role:write` ; si ce rôle n'a qu'un occupant, le supprimer ou lui retirer
   * son rôle viderait la permission.
   */
  private readonly lockedMemberIds = computed(() => {
    const locked = new Set<number>();
    for (const roleId of this.soleLivingHolderByPermission().values()) {
      const holders = this.store.members().filter((member) => member.roleId === roleId);
      if (holders.length === 1) locked.add(holders[0].id);
    }
    return locked;
  });

  protected actionsDisabled(memberId: number): boolean {
    return !this.canActOn(memberId);
  }

  /** Motif affiché en `title`, pour que l'inertie soit lisible. */
  protected actionsReason(memberId: number): string | null {
    if (!this.canWriteMembers()) return 'Permission member:write requise.';
    if (!this.canActOn(memberId)) return 'Ce membre porte des permissions que vous n’avez pas.';
    return null;
  }

  protected openMemberMenu(event: MouseEvent, member: ApiTeamMember): void {
    const locked = this.lockedMemberIds().has(member.id);
    const isSelf = this.currentMember()?.id === member.id;

    this.dropdown.toggle({
      anchor: event.currentTarget as HTMLElement,
      placement: 'bottom-end',
      width: 200,
      items: [
        {
          type: 'action',
          icon: this.icPencil,
          label: 'Modifier',
          onClick: () => this.openEdit(member.id),
        },
        { type: 'separator' },
        {
          type: 'action',
          icon: this.icTrash,
          label: 'Supprimer',
          danger: true,
          disabled: isSelf || locked,
          description: isSelf
            ? 'Vous ne pouvez pas supprimer votre propre compte.'
            : locked
              ? 'Dernier porteur d’une permission d’administration.'
              : undefined,
          onClick: () => this.confirmDelete(member),
        },
      ],
    });
  }

  private openEdit(memberId: number): void {
    this.modal.open({
      type: 'component',
      component: MemberEditModal,
      inputs: {
        memberId,
        grantableRoleIds: this.grantableRoleIds(),
        roleLocked: this.lockedMemberIds().has(memberId),
      },
    });
  }

  private confirmDelete(member: ApiTeamMember): void {
    const name = `${member.firstName} ${member.lastName}`.trim();
    this.modal.open({
      type: 'delete',
      title: 'Supprimer ce membre ?',
      message: `${name} perdra aussi son compte utilisateur et ses sessions ouvertes.`,
      details:
        'Ses affectations et ses préférences de postes sont supprimées ; les commandes qu’il a encaissées et le journal d’activité sont conservés sans leur auteur.',
      onConfirm: () => void this.deleteMember(member.id),
    });
  }

  private async deleteMember(memberId: number): Promise<void> {
    await this.store.deleteMember(memberId);

    const error = this.store.memberErrorId() === memberId ? this.store.memberError() : null;
    this.toast.show(
      error
        ? { type: 'error', title: 'Suppression refusée', message: error }
        : { type: 'success', title: 'Membre supprimé' },
    );
  }

  /** La ligne de tableau est une vue ; les actions travaillent sur la ressource
   *  API. La garde évite un `!` sur une ligne qu'une suppression concurrente
   *  aurait pu retirer du store entre le rendu et le clic. */
  protected onActionsClick(event: MouseEvent, memberId: number): void {
    const member = this.store.members().find((entry) => entry.id === memberId);
    if (member) this.openMemberMenu(event, member);
  }

  protected readonly audit = computed(() =>
    toAuditEntries(this.store.logs(), this.store.members(), this.now()),
  );

  private readonly subtitle = computed(() => {
    if (this.loading() === 'loading' || this.loading() === 'init') return 'Chargement…';
    if (this.loading() === 'error') return 'Données indisponibles';
    const members = this.store.members().length;
    const roles = this.store.roles().length;
    const permissions = this.store.permissions().length;
    return `${members} membre${members > 1 ? 's' : ''} · ${roles} rôle${roles > 1 ? 's' : ''} · ${permissions} permission${permissions > 1 ? 's' : ''}`;
  });

  /**
   * MOCK — the backend has no `invitations` table and no invitation endpoint.
   * Per project rule (front feature without a backend ⇒ the backend is incomplete),
   * the panel stays in place with these placeholder rows until `GET /invitations` exists.
   */
  protected readonly invitations: readonly Invitation[] = [
    { mail: 'c.guerin@etu.ec.fr', role: 'Coordo (suppléant)', exp: '14 fév.' },
    { mail: 'r.albert@etu.ec.fr', role: 'Membre actif', exp: '14 fév.' },
  ];

  protected readonly skeletonRows = [0, 1, 2, 3, 4];

  protected onSearch(value: string): void {
    this.searchQuery.set(value);
  }

  /**
   * Role names come straight from the `roles` table (`Finance`, `Logistics`, …) and the API
   * defines no privilege hierarchy, so colouring by name would be an invention: every role
   * gets the neutral badge, and "no role" gets the ghost variant.
   */
  protected roleKind(role: string | null): BadgeKind {
    return role === null ? 'ghost' : 'neutral';
  }

  protected cellDisabled(roleId: number, permission: string): boolean {
    if (!this.canWriteRoles()) return true;
    if (this.store.savingRoleIds().includes(roleId)) return true;
    return this.soleLivingHolderByPermission().get(permission) === roleId;
  }

  protected async onToggle(roleId: number, permission: string, granted: boolean): Promise<void> {
    await this.store.setRolePermission(roleId, permission, granted);

    const error =
      this.store.permissionsErrorRoleId() === roleId ? this.store.permissionsError() : null;
    this.toast.show(
      error
        ? { type: 'error', title: 'Modification refusée', message: error }
        : { type: 'success', title: 'Permissions mises à jour' },
    );
  }

  protected auditIconClass(c: AuditEntry['c']): string {
    if (c === 'warn') return 'bg-warn-soft text-warn';
    if (c === 'ok') return 'bg-ok-soft text-ok';
    if (c === 'danger') return 'bg-danger-soft text-danger';
    if (c === 'blue') return 'bg-blue-soft text-blue';
    return 'bg-surface-2 text-muted';
  }
}
