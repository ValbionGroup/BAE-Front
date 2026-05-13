import {
  ChangeDetectionStrategy,
  Component,
  computed,
  forwardRef,
  input,
  output,
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { LucideDynamicIcon, LucideIconInput } from '@lucide/angular';

const SIZE_CLASSES: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'h-[30px]',
  md: 'h-9',
  lg: 'h-11',
};

@Component({
  selector: 'bfd-input',
  templateUrl: './input.html',
  imports: [LucideDynamicIcon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => Input),
      multi: true,
    },
  ],
  host: { '[attr.id]': 'null' },
})
export class Input implements ControlValueAccessor {
  readonly icon = input<LucideIconInput | null>(null);
  readonly placeholder = input<string>('');
  readonly value = input<string>('');
  readonly size = input<'sm' | 'md' | 'lg'>('md');
  readonly suffix = input<string | null>(null);
  readonly type = input<string>('text');
  readonly disabled = input<boolean>(false);
  readonly invalid = input<boolean>(false);

  readonly valueChange = output<string>();

  protected innerValue = '';
  protected isDisabled = false;

  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  protected readonly wrapperClass = computed(() => {
    const base =
      'flex items-center gap-2 px-3 bg-surface-2 rounded-md border text-text text-[13px]';
    const sizeClass = SIZE_CLASSES[this.size()];
    const borderClass = this.invalid() ? 'border-danger' : 'border-border';
    return `${base} ${sizeClass} ${borderClass}`;
  });

  writeValue(value: string): void {
    this.innerValue = value ?? '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.isDisabled = isDisabled;
  }

  protected onInput(event: Event): void {
    const v = (event.target as HTMLInputElement).value;
    this.innerValue = v;
    this.onChange(v);
    this.valueChange.emit(v);
  }
}
