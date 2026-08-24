import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideUserPen } from '@lucide/angular';
import { Btn, Field, Input } from '@bae/ui';
import { ClientsStore } from '#core/store/clients.store';
import type { ClientDetail } from '#pages/authed/adherents/adherents.types';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Téléphone et note seulement : `updateClientValidator` refuse promotion et
 * école, qui dérivent des claims SSO et seraient écrasées au prochain login.
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
  /** Le store recharge la liste et les compteurs, jamais la fiche ouverte. */
  readonly onSaved = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  protected readonly store = inject(ClientsStore);

  protected readonly icEdit = LucideUserPen;

  constructor() {
    // Échap ferme sans passer par `close()`, et `saveError` est dans le store.
    this.store.clearSaveError();
  }

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

    // `null` vide le champ côté validateur, `undefined` ne le touche pas.
    const ok = await this.store.updateClient(this.client().id, {
      phone: this.emptyToNull(this.phone()),
      note: this.emptyToNull(this.note()),
    });

    if (!ok) return;
    this.onSaved()();
    this.modalService.close(this.id());
  }

  private emptyToNull(value: string): string | null {
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  }
}
