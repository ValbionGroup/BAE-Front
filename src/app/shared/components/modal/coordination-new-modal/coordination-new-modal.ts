import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  LucideArrowRight,
  LucideCalendar,
  LucideCheck,
  LucideClock,
  LucideDynamicIcon,
} from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { Field } from '#shared/components/ui/field/field';
import { Input } from '#shared/components/ui/input/input';
import {
  CoordinationService,
  type ApiEvent,
} from '#core/services/coordination/coordination-service';
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
  private readonly svc = inject(CoordinationService);
  private readonly destroyRef = inject(DestroyRef);

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
    this.svc
      .createEvent(this.name().trim(), isoDate, duration)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (ev) => {
          this.onCreated()?.(ev);
          this.close();
        },
        error: () => {
          this.saving.set(false);
        },
      });
  }

  protected close(): void {
    this.modalService.close(this.id());
  }
}
