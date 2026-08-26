import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideBriefcase } from '@lucide/angular';
import { Btn, Field, Input, messageOf } from '@bae/ui';
import { JOB_PERIODS, JOB_PERIOD_LABELS, type JobPeriod } from '#core/models/job-period.model';
import type { ApiJob } from '#core/services/referentiels/referentiels-service';
import { ReferentielsStore } from '#core/store/referentiels.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

/**
 * Saisie d'un poste. Séparée de `NamedEntityModal` parce qu'un poste porte, en
 * plus du nom, une **période** et une description — l'y plier donnerait un
 * formulaire à champs conditionnels.
 *
 * ⚠️ Le vocabulaire des périodes vient de `JOB_PERIOD_LABELS`, que le modèle
 * désigne comme sa source unique : « never redeclare these strings at a call
 * site ». Ce sont « Préparation / Soirée / Nettoyage », pas autre chose.
 */
@Component({
  selector: 'bfd-job-edit-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './job-edit-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class JobEditModal {
  readonly id = input.required<string>();
  /** `null` = création. */
  readonly job = input<ApiJob | null>(null);
  readonly onDone = input<() => void>(() => {});

  private readonly modalService = inject(ModalService);
  private readonly store = inject(ReferentielsStore);

  protected readonly icJob = LucideBriefcase;

  protected readonly periods = JOB_PERIODS.map((value) => ({
    value,
    label: JOB_PERIOD_LABELS[value],
  }));

  protected readonly name = signal<string>('');
  protected readonly description = signal<string>('');
  /** « Soirée » par défaut : c'est le gros des postes d'un service. */
  protected readonly type = signal<JobPeriod>('during');

  protected readonly submitted = signal(false);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    queueMicrotask(() => {
      const job = this.job();
      if (!job) return;
      this.name.set(job.name);
      this.description.set(job.description ?? '');
      this.type.set(job.type);
    });
  }

  protected onName(value: string): void {
    this.name.set(value);
  }
  protected onDescription(value: string): void {
    this.description.set(value);
  }
  protected onType(value: string): void {
    this.type.set(value as JobPeriod);
  }

  protected readonly valid = computed(() => this.name().trim() !== '');

  protected readonly title = computed(() => (this.job() ? 'Modifier le poste' : 'Nouveau poste'));

  protected async submit(): Promise<void> {
    this.submitted.set(true);
    if (!this.valid() || this.busy()) return;

    const trimmed = this.description().trim();
    const input = {
      name: this.name().trim(),
      type: this.type(),
      // ⚠️ `null` et non `''` : la colonne est nullable, et une chaîne vide
      // s'afficherait comme une description existante mais muette.
      description: trimmed === '' ? null : trimmed,
    };

    this.busy.set(true);
    this.error.set(null);
    try {
      const existing = this.job();
      const result = existing
        ? await this.store.updateJob(existing.id, input)
        : await this.store.createJob(input);

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
