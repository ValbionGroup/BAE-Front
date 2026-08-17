import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
  signal,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideCheck, LucideDynamicIcon } from '@lucide/angular';

@Component({
  selector: 'bae-checkbox',
  imports: [LucideDynamicIcon],
  templateUrl: './checkbox.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Checkbox),
      multi: true,
    },
  ],
})
export class Checkbox implements ControlValueAccessor {
  readonly checked = input<boolean>(false);
  readonly disabled = input<boolean>(false);
  readonly ariaLabel = input<string | null>(null);

  readonly change = output<boolean>();

  protected readonly icCheck = LucideCheck;

  private readonly cvaValue = signal<boolean | null>(null);
  private inCvaMode = false;
  private cvaDisabled = false;
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  protected readonly internalChecked = computed(() => this.cvaValue() ?? this.checked());
  protected readonly internalDisabled = computed(() => this.cvaDisabled || this.disabled());

  protected readonly boxClass = computed(
    () =>
      'inline-flex h-3.5 w-3.5 items-center justify-center rounded-[3px] border-[1.4px] cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 disabled:cursor-not-allowed disabled:opacity-40 ' +
      (this.internalChecked() ? 'border-blue bg-blue text-white' : 'border-border bg-transparent'),
  );

  protected toggle(): void {
    if (this.internalDisabled()) {
      return;
    }
    const next = !this.internalChecked();
    if (this.inCvaMode) {
      this.cvaValue.set(next);
    }
    this.onChange(next);
    this.onTouched();
    this.change.emit(next);
  }

  writeValue(value: boolean | null | undefined): void {
    this.inCvaMode = true;
    this.cvaValue.set(value ?? false);
  }

  registerOnChange(fn: (value: boolean) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.cvaDisabled = isDisabled;
  }
}
