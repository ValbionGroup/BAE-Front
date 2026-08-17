import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

export type BadgeKind = 'neutral' | 'blue' | 'red' | 'ok' | 'warn' | 'danger' | 'ghost';

const KIND_CLASSES: Record<BadgeKind, string> = {
  neutral: 'bg-surface-2 text-text-2 border-border',
  blue: 'bg-blue-soft text-blue border-transparent',
  red: 'bg-red-soft text-red border-transparent',
  ok: 'bg-ok-soft text-ok border-transparent',
  warn: 'bg-warn-soft text-warn border-transparent',
  danger: 'bg-danger-soft text-danger border-transparent',
  ghost: 'bg-transparent text-muted border-border',
};

@Component({
  selector: 'bae-badge',
  templateUrl: './badge.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Badge {
  readonly kind = input<BadgeKind>('neutral');
  readonly dot = input<boolean>(false);

  protected readonly kindClass = computed(() => KIND_CLASSES[this.kind()]);
}
