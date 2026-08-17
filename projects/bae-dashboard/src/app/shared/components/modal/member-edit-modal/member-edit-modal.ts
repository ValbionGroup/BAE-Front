import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideUserPen } from '@lucide/angular';
import { Btn, Field, Input } from '@bae/ui';
import { TeamStore } from '#core/store/team.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Édition d'un membre : prénom, nom, rôle.
 *
 * Le rôle est un `<select>` natif et non un composant maison : il n'existe pas
 * de `bfd-select` dans le dépôt, et en fabriquer un pour trois options serait un
 * composant partagé conçu sur un seul cas d'usage — sans compter le clavier et
 * les lecteurs d'écran, que le natif donne gratuitement.
 *
 * `grantableRoleIds` vient de l'appelant plutôt que d'être recalculé ici : la
 * règle d'attribution a besoin des permissions de l'utilisateur courant, qui
 * vivent dans le store d'authentification, pas dans `TeamStore`.
 */
@Component({
  selector: 'bfd-member-edit-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './member-edit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MemberEditModal {
  readonly id = input.required<string>();
  readonly memberId = input.required<number>();
  /** Rôles que l'utilisateur courant a le droit d'attribuer (règle 2). */
  readonly grantableRoleIds = input<readonly number[]>([]);
  /**
   * Vrai si ce membre est le dernier occupant vivant d'un rôle qui porte seul
   * `role:read` ou `role:write` (miroir de l'invariant anti-verrouillage, côté
   * page dans `lockedMemberIds`). Le renommer reste possible — seul le rôle
   * est verrouillé, car c'est lui seul que le back refuserait de toucher ici.
   */
  readonly roleLocked = input<boolean>(false);

  private readonly modalService = inject(ModalService);
  protected readonly store = inject(TeamStore);

  protected readonly icEdit = LucideUserPen;

  private readonly member = computed(() =>
    this.store.members().find((entry) => entry.id === this.memberId()),
  );

  /** `null` tant que l'utilisateur n'a rien touché : le champ suit alors la
   *  valeur du store, y compris si une autre écriture la met à jour. */
  private readonly firstNameEdit = signal<string | null>(null);
  private readonly lastNameEdit = signal<string | null>(null);
  private readonly roleIdEdit = signal<number | null | undefined>(undefined);

  protected readonly firstName = computed(
    () => this.firstNameEdit() ?? this.member()?.user?.firstName ?? '',
  );
  protected readonly lastName = computed(
    () => this.lastNameEdit() ?? this.member()?.user?.lastName ?? '',
  );
  protected readonly roleId = computed(() => {
    const edited = this.roleIdEdit();
    return edited === undefined ? (this.member()?.roleId ?? null) : edited;
  });

  protected readonly roleOptions = computed(() => {
    const grantable = new Set(this.grantableRoleIds());
    const current = this.member()?.roleId ?? null;
    // Le rôle actuel reste listé même s'il n'est pas attribuable, sinon le
    // `<select>` s'ouvrirait sur une valeur absente de ses options.
    return this.store.roles().filter((role) => grantable.has(role.id) || role.id === current);
  });

  protected readonly saving = computed(() =>
    this.store.savingMemberIds().includes(this.memberId()),
  );

  protected readonly canSubmit = computed(
    () => this.firstName().trim().length > 0 && this.lastName().trim().length > 0 && !this.saving(),
  );

  protected onFirstName(value: string): void {
    this.firstNameEdit.set(value);
  }

  protected onLastName(value: string): void {
    this.lastNameEdit.set(value);
  }

  protected onRole(value: string): void {
    this.roleIdEdit.set(value === '' ? null : Number(value));
  }

  protected close(): void {
    this.modalService.close(this.id());
  }

  protected async submit(): Promise<void> {
    if (!this.canSubmit()) return;

    await this.store.updateMember(this.memberId(), {
      firstName: this.firstName().trim(),
      lastName: this.lastName().trim(),
      roleId: this.roleId(),
    });

    // La modale ne se ferme que si l'écriture a abouti : un refus doit rester
    // lisible à côté du formulaire qui l'a provoqué.
    if (this.store.memberErrorId() !== this.memberId()) {
      this.close();
    }
  }
}
