import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Badge, Btn, Field, Input, Textarea } from '@bae/ui';

import { ProfileStore, type ProfileWritePayload } from '../../../../core/profile.store';
import { SessionStore } from '../../../../core/session.store';

/** La règle de Telegram, arobase optionnelle — la même que côté serveur. */
const TELEGRAM_HANDLE = /^@?[A-Za-z][A-Za-z0-9_]{4,31}$/;

export const PREPARATION_NOTE_MAX = 500;

@Component({
  selector: 'bfp-profile-form',
  imports: [ReactiveFormsModule, Badge, Btn, Field, Input, Textarea],
  templateUrl: './profile-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileForm {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(ProfileStore);
  protected readonly session = inject(SessionStore);

  protected readonly maxNote = PREPARATION_NOTE_MAX;
  protected readonly saved = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    phone: [''],
    telegramHandle: ['', [Validators.pattern(TELEGRAM_HANDLE)]],
    preparationNote: ['', [Validators.maxLength(PREPARATION_NOTE_MAX)]],
  });

  /** Renseigné à la soumission seulement : signaler l'erreur à la frappe harcèle. */
  protected readonly handleRejected = signal(false);

  protected readonly saving = this.store.saving;
  protected readonly saveError = this.store.saveError;

  constructor() {
    effect(() => {
      const client = this.session.client();
      if (client === null) return;

      this.form.reset({
        phone: client.phone ?? '',
        telegramHandle: client.telegram.handle ?? '',
        preparationNote: client.preparationNote ?? '',
      });
    });
  }

  protected async submit(): Promise<void> {
    this.saved.set(false);
    this.handleRejected.set(this.form.controls.telegramHandle.invalid);

    if (this.form.invalid) return;

    const patch = this.changedFields();
    if (Object.keys(patch).length === 0) return;

    if (await this.store.save(patch)) {
      this.saved.set(true);
      this.form.markAsPristine();
    }
  }

  /**
   * Seules les clés touchées partent : une clé absente veut dire « ne touche
   * pas », et une chaîne vide est un effacement, donc `null`.
   */
  private changedFields(): ProfileWritePayload {
    const patch: ProfileWritePayload = {};

    for (const key of ['phone', 'telegramHandle', 'preparationNote'] as const) {
      const control = this.form.controls[key];
      if (!control.dirty) continue;

      const value = control.value.trim();
      patch[key] = value === '' ? null : value;
    }

    return patch;
  }
}
