import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideUserPen } from '@lucide/angular';
import { Btn, Field, Input } from '@bae/ui';
import { ClientsStore } from '#core/store/clients.store';
import type { ClientDetail } from '#pages/authed/adherents/adherents.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Fiche adhérent : téléphone et note interne, rien d'autre.
 *
 * ⚠️ Ni la promotion ni l'école, bien que la fiche les affiche :
 * `updateClientValidator` les refuse **délibérément** côté back parce qu'elles
 * dérivent des claims `diplome` et `ecole`, et que le prochain login SSO
 * écraserait toute saisie faite ici. Un champ qui se vide tout seul sans erreur
 * ni trace est pire que pas de champ du tout.
 *
 * Le nom et l'email viennent d'EirbConnect et ne sont pas modifiables non plus.
 *
 * L'adhérent est passé en entier plutôt que par son id : `ClientsStore` ne
 * garde pas les détails, il les relit à la demande, et la modale n'a pas à
 * refaire cet appel juste pour préremplir deux champs.
 */
@Component({
  selector: 'bfd-client-edit-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './client-edit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ClientEditModal {
  readonly id = input.required<string>();
  readonly client = input.required<ClientDetail>();
  /** Prévient la page qu'il faut relire le détail : le store recharge la liste
   *  et les compteurs, mais pas la fiche ouverte, qu'il ne conserve pas. */
  readonly onSaved = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  protected readonly store = inject(ClientsStore);

  protected readonly icEdit = LucideUserPen;

  constructor() {
    // Échap ferme la modale sans passer par `close()` : sans ce nettoyage,
    // l'erreur d'une tentative abandonnée réapparaîtrait à la réouverture.
    this.store.clearSaveError();
  }

  /** `null` tant que l'utilisateur n'a rien touché : le champ suit alors la
   *  valeur reçue, comme dans `MemberEditModal`. */
  private readonly phoneEdit = signal<string | null>(null);
  private readonly noteEdit = signal<string | null>(null);

  protected readonly phone = computed(() => this.phoneEdit() ?? this.client().phone ?? '');
  protected readonly note = computed(() => this.noteEdit() ?? this.client().note ?? '');

  protected onPhone(value: string): void {
    this.phoneEdit.set(value);
  }

  protected onNote(value: string): void {
    this.noteEdit.set(value);
  }

  protected close(): void {
    this.store.clearSaveError();
    this.modalService.close(this.id());
  }

  protected async submit(): Promise<void> {
    if (this.store.saving()) return;

    // `null` veut dire « vider », `undefined` « ne pas toucher » : un champ
    // laissé vide efface donc la valeur, il ne la conserve pas en silence.
    const ok = await this.store.updateClient(this.client().id, {
      phone: this.emptyToNull(this.phone()),
      note: this.emptyToNull(this.note()),
    });

    // Un refus doit rester lisible à côté du formulaire qui l'a provoqué.
    if (!ok) return;
    this.onSaved()();
    this.modalService.close(this.id());
  }

  private emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
}
