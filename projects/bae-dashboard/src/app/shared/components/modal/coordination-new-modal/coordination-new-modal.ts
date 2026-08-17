import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { LucideArrowRight, LucideCalendar, LucideCheck, LucideClock } from '@lucide/angular';
import { Btn, Field, Input } from '@bae/ui';
import { type ApiEvent } from '#core/services/coordination/coordination-service';
import { CoordinationStore } from '#core/store/coordination.store';
import { ModalService } from '../modal.service';
import { ModalShell } from '../modal-shell/modal-shell';

function calcDuration(startHHMM: string, endHHMM: string): number {
  const [sh, sm] = startHHMM.split(':').map(Number);
  const [eh, em] = endHHMM.split(':').map(Number);
  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;
  if (endMin <= startMin) endMin += 24 * 60;
  return (endMin - startMin) * 60;
}

@Component({
  selector: 'bfd-coordination-new-modal',
  imports: [Btn, Field, Input, ModalShell],
  templateUrl: './coordination-new-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CoordinationNewModal {
  readonly id = input.required<string>();
  readonly onCreated = input<((ev: ApiEvent) => void) | null>(null);

  private readonly modalService = inject(ModalService);
  private readonly store = inject(CoordinationStore);

  protected readonly icCalendar = LucideCalendar;
  protected readonly icClock = LucideClock;
  protected readonly icCheck = LucideCheck;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly name = signal('');
  protected readonly date = signal('');
  protected readonly time = signal('');
  protected readonly endTime = signal('');
  protected readonly saving = signal(false);

  protected readonly canSubmit = computed(
    () => this.name().trim().length > 0 && this.date().trim().length >= 8 && !this.saving(),
  );

  protected submit(): void {
    if (!this.canSubmit()) return;

    const [day, month, year] = this.date().trim().split('/');
    const time = this.time().trim() || '20:00';
    const isoDate = `${year}-${month}-${day}T${time}:00`;
    const end = this.endTime().trim();
    const duration = end ? calcDuration(time, end) : null;

    this.saving.set(true);
    this.store
      .createEvent(this.name().trim(), isoDate, duration)
      .then((ev) => {
        this.onCreated()?.(ev);
        this.close();
      })
      .catch(() => {
        this.saving.set(false);
      });
  }

  protected close(): void {
    this.modalService.close(this.id());
  }
}
