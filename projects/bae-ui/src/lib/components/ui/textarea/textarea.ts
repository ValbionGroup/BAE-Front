import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * Champ multiligne, pendant de `bae-input`. Sans `<label>` interne : il se place
 * dans un `bae-field`, qui en est déjà un.
 *
 * Deux modes, à ne pas mélanger sur une même instance : contrôlé (`[value]` +
 * `(valueChange)`) ou CVA (`formControl`), comme `bae-checkbox`.
 */
@Component({
  selector: 'bae-textarea',
  templateUrl: './textarea.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Textarea),
      multi: true,
    },
  ],
  host: { '[attr.id]': 'null' },
})
export class Textarea implements ControlValueAccessor {
  readonly value = input<string>('');
  readonly placeholder = input<string>('');
  readonly rows = input<number>(3);
  readonly maxlength = input<number | null>(null);
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);

  /** `readonly` plutôt que `disabled` pour un champ affiché mais non modifiable. */
  readonly readonly = input<boolean>(false);

  readonly resize = input<'none' | 'vertical'>('vertical');

  /** Transmis au `<textarea>` interne : l'hôte ne prend pas le focus. */
  readonly ariaLabel = input<string | null>(null);
  readonly id = input<string | null>(null);
  readonly errorId = input<string | null>(null);

  readonly valueChange = output<string>();

  private readonly innerValue = signal('');
  private readonly cvaDisabled = signal(false);

  /** `[value]` reste maître en mode contrôlé ; en CVA c'est `writeValue` qui l'est. */
  private inCvaMode = false;
  private onChange: (value: string) => void = () => {};
  protected onTouched: () => void = () => {};

  protected readonly internalValue = this.innerValue.asReadonly();
  protected readonly internalDisabled = computed(() => this.cvaDisabled() || this.disabled());

  constructor() {
    effect(() => {
      const next = this.value();
      if (!this.inCvaMode) this.innerValue.set(next);
    });
  }

  protected readonly remaining = computed(() => {
    const max = this.maxlength();
    return max === null ? null : max - this.internalValue().length;
  });

  protected readonly boxClass = computed(() => {
    const base =
      'w-full px-3 py-2.5 bg-surface-2 rounded-md border text-text text-[13px] outline-none focus-visible:ring-2 focus-visible:ring-blue/40';
    const borderClass = this.invalid() ? 'border-danger' : 'border-border';
    const resizeClass = this.resize() === 'none' ? 'resize-none' : 'resize-y';
    return `${base} ${borderClass} ${resizeClass}`;
  });

  writeValue(value: string | null | undefined): void {
    this.inCvaMode = true;
    this.innerValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled.set(isDisabled);
  }

  protected onInput(event: Event): void {
    const next = (event.target as HTMLTextAreaElement).value;
    this.innerValue.set(next);
    this.onChange(next);
    this.valueChange.emit(next);
  }
}
