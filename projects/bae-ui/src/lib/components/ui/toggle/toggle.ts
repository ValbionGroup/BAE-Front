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

@Component({
  selector: 'bae-toggle',
  templateUrl: './toggle.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Toggle),
      multi: true,
    },
  ],
})
export class Toggle implements ControlValueAccessor {
  readonly on = input<boolean>(false);
  readonly label = input<string | null>(null);
  readonly disabled = input<boolean>(false);

  readonly change = output<boolean>();

  protected readonly internalOn = computed(() => this.cvaValue() ?? this.on());
  protected readonly internalDisabled = computed(() => this.cvaDisabled || this.disabled());

  protected readonly trackClass = computed(
    () =>
      'w-8 h-[18px] rounded-[9px] p-0.5 inline-flex transition-colors ' +
      (this.internalOn() ? 'bg-blue' : 'bg-border'),
  );

  protected readonly knobTransform = computed(() => `translateX(${this.internalOn() ? 14 : 0}px)`);

  private readonly cvaValue = signal<boolean | null>(null);
  private inCvaMode = false;
  private cvaDisabled = false;
  private onChange: (value: boolean) => void = () => {};
  private onTouched: () => void = () => {};

  protected toggle(): void {
    if (this.internalDisabled()) {
      return;
    }
    const next = !this.internalOn();
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
