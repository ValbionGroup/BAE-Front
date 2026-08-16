import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideDynamicIcon, LucideIconInput } from '@lucide/angular';

type BtnKind = 'primary' | 'danger' | 'secondary' | 'outline' | 'ghost' | 'quiet';
type BtnSize = 'sm' | 'md' | 'lg' | 'xl';

const SIZE_CLASSES: Record<BtnSize, string> = {
  sm: 'h-7 px-2.5 text-xs gap-1.5',
  md: 'h-[34px] px-3 text-[13px] gap-1.5',
  lg: 'h-[42px] px-4 text-sm gap-2',
  xl: 'h-14 px-[22px] text-base gap-2.5',
};

const SIZE_ICON: Record<BtnSize, number> = {
  sm: 14,
  md: 15,
  lg: 17,
  xl: 20,
};

const KIND_CLASSES: Record<BtnKind, string> = {
  primary: 'bg-blue text-white border border-blue hover:bg-blue-deep',
  danger: 'bg-red text-white border border-red hover:bg-red-deep',
  secondary: 'bg-surface-2 text-text border border-border hover:bg-surface-3',
  outline: 'bg-transparent text-text border border-border hover:bg-surface-2',
  ghost: 'bg-transparent text-text-2 border border-transparent hover:bg-surface-2',
  quiet: 'bg-transparent text-muted border border-transparent hover:bg-surface-2',
};

const BASE_CLASSES =
  'inline-flex items-center justify-center font-medium rounded-md cursor-pointer transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 disabled:opacity-40 disabled:cursor-not-allowed';

@Component({
  selector: 'bfd-btn',
  imports: [LucideDynamicIcon],
  templateUrl: './btn.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.w-full]': 'full()',
    '[attr.id]': 'null',
  },
})
export class Btn {
  readonly kind = input<BtnKind>('primary');
  readonly size = input<BtnSize>('md');
  readonly icon = input<LucideIconInput | null>(null);
  readonly iconRight = input<LucideIconInput | null>(null);
  readonly full = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly type = input<'button' | 'submit' | 'reset'>('button');

  /** Forwarded to the inner <button>, so labels and descriptions can point at it. */
  readonly id = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);
  readonly ariaPressed = input<boolean | null>(null);
  readonly ariaDescribedby = input<string | null>(null);

  readonly clicked = output<MouseEvent>();

  readonly iconSize = computed(() => SIZE_ICON[this.size()]);

  readonly classes = computed(() => {
    const parts = [BASE_CLASSES, KIND_CLASSES[this.kind()], SIZE_CLASSES[this.size()]];
    if (this.full()) {
      parts.push('w-full');
    }
    return parts.join(' ');
  });

  onClick(event: MouseEvent): void {
    this.clicked.emit(event);
  }
}
