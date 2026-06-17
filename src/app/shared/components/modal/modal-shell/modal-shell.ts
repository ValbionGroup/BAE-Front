import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput, LucideX } from '@lucide/angular';

type Tone = 'blue' | 'warn' | 'danger' | 'ok';

const TONE_CLASSES: Record<Tone, { bg: string; fg: string }> = {
  blue: { bg: 'bg-blue-soft', fg: 'text-blue' },
  warn: { bg: 'bg-warn-soft', fg: 'text-warn' },
  danger: { bg: 'bg-danger-soft', fg: 'text-danger' },
  ok: { bg: 'bg-ok-soft', fg: 'text-ok' },
};

@Component({
  selector: 'bfd-modal-shell',
  imports: [LucideDynamicIcon, LucideX],
  templateUrl: './modal-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalShell {
  readonly icon = input<LucideIconInput | null>(null);
  readonly tone = input<Tone>('blue');
  readonly eyebrow = input<string | null>(null);
  readonly title = input<string>('');
  readonly subtitle = input<string | null>(null);
  readonly width = input<number>(560);

  readonly close = output<void>();

  protected readonly toneClasses = computed(() => TONE_CLASSES[this.tone()]);

  protected onClose(): void {
    this.close.emit();
  }
}
