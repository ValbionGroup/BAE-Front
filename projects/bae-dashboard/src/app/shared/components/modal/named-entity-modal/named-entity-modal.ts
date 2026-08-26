import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideTag } from '@lucide/angular';
import { Btn, Field, Input, messageOf } from '@bae/ui';
import type { WriteResult } from '#core/store/referentiels.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Saisie d'une entité qui ne porte **qu'un nom** — une catégorie de denrées, une
 * enseigne. Les deux tables n'ont littéralement pas d'autre colonne écrivable.
 *
 * ⚠️ Volontairement **pas** étendue aux postes, qui portent en plus une période
 * et une description : les y plier donnerait un formulaire à champs
 * conditionnels, moins lisible que deux modales franches.
 *
 * L'appelant fournit `save` plutôt qu'un identifiant de domaine : la modale n'a
 * pas à savoir si elle crée une catégorie ou renomme une enseigne.
 */
@Component({
  selector: 'bfd-named-entity-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './named-entity-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NamedEntityModal {
  readonly id = input.required<string>();
  readonly title = input.required<string>();
  readonly label = input<string>('Nom');
  readonly placeholder = input<string>('');
  /** Vide à la création, le nom actuel à la modification. */
  readonly initial = input<string>('');
  readonly save = input.required<(name: string) => Promise<WriteResult>>();
  readonly onDone = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);

  protected readonly icTag = LucideTag;

  protected readonly name = signal<string>('');
  /** L'erreur de champ ne s'affiche qu'après une tentative d'envoi. */
  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  /** Refus du serveur : un 409 porte une phrase qu'il faut lire. */
  protected readonly error = signal<string | null>(null);

  constructor() {
    // ⚠️ Les `input()` ne sont pas encore posés à la construction. Lu une seule
    // fois, et non par un `effect` : l'utilisateur doit pouvoir vider le champ
    // sans qu'on le lui remplisse à nouveau.
    queueMicrotask(() => this.name.set(this.initial()));
  }

  protected onName(value: string): void {
    this.name.set(value);
  }

  protected readonly valid = computed(() => this.name().trim() !== '');

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (!this.valid() || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    try {
      const result = await this.save()(this.name().trim());
      if (!result.ok) {
        this.error.set(messageOf(result.error, "L'enregistrement a échoué."));
        return;
      }
      this.onDone()();
      this.modalService.close(this.id());
    } finally {
      this.busy.set(false);
    }
  }

  protected cancel(): void {
    this.modalService.close(this.id());
  }
}
