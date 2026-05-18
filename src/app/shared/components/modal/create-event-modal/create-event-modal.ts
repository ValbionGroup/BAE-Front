import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { LucideX } from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { CreateEventModalConfig } from '../modal.models';

@Component({
  selector: 'bfd-create-event-modal',
  imports: [LucideX, Btn],
  templateUrl: './create-event-modal.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateEventModal {
  config = input.required<CreateEventModalConfig>();
  close = output<void>();

  protected readonly name = signal('');
  protected readonly date = signal('');
  protected readonly time = signal('19:00');

  protected readonly canSave = computed(() =>
    this.name().trim().length > 0 && this.date().trim().length > 0,
  );

  constructor() {
    const today = new Date();
    this.date.set(this.formatDate(today));
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onSave(): void {
    this.config().onCreate({
      name: this.name().trim(),
      date: this.date().trim(),
      time: this.time().trim(),
    });
    this.close.emit();
  }

  protected onNameInput(event: Event): void {
    this.name.set((event.target as HTMLInputElement).value);
  }

  protected onDateInput(event: Event): void {
    this.date.set((event.target as HTMLInputElement).value);
  }

  protected onTimeInput(event: Event): void {
    this.time.set((event.target as HTMLInputElement).value);
  }

  protected inputClass(invalid: boolean): string {
    const base =
      'w-full px-3 py-2 text-[13px] rounded-md bg-surface-2 text-text placeholder-muted focus:outline-none focus-visible:ring-2';
    const border = invalid
      ? 'border border-danger focus-visible:ring-danger/40'
      : 'border border-border focus-visible:ring-blue/40';
    return `${base} ${border}`;
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}
