import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

const ACCENT_CLASSES: readonly string[] = [
  'bg-blue-soft text-blue',
  'bg-red-soft text-red',
  'bg-ok-soft text-ok',
  'bg-warn-soft text-warn',
];

@Component({
  selector: 'bfd-avatar',
  templateUrl: './avatar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Avatar {
  readonly name = input<string>('?');
  readonly size = input<number>(24);

  protected readonly initials = computed<string>(() => {
    const value = this.name() || '?';
    const computed = value
      .split(' ')
      .filter((word) => word.length > 0)
      .map((word) => word[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
    return computed || '?';
  });

  protected readonly accentIndex = computed<number>(() => {
    return (this.name().charCodeAt(0) || 0) % 4;
  });

  protected readonly accentClass = computed<string>(() => ACCENT_CLASSES[this.accentIndex()]);
}
