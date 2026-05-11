import { ChangeDetectionStrategy, Component, computed, forwardRef, input } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'bfd-text-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TextInput),
      multi: true,
    },
  ],
  host: { '[attr.id]': 'null' },
  template: `
    <input
      [id]="id()"
      [type]="type()"
      [placeholder]="placeholder()"
      [autocomplete]="autocomplete()"
      [attr.aria-describedby]="errorId() ?? null"
      [attr.aria-invalid]="invalid() ? 'true' : null"
      [value]="value"
      (input)="onInput($event)"
      (blur)="onTouched()"
      [class]="classes()"
    />
  `,
})
export class TextInput implements ControlValueAccessor {
  id = input.required<string>();
  type = input('text');
  placeholder = input('');
  autocomplete = input('off');
  invalid = input(false);
  errorId = input<string | null>(null);

  protected value = '';
  private onChange = (_: string) => {};
  protected onTouched = () => {};

  protected classes = computed(() => {
    const base =
      'w-full px-4 py-3 bg-white dark:bg-gray-800 border rounded-xl text-gray-900 dark:text-gray-100 text-[0.9375rem] placeholder:text-gray-400 dark:placeholder:text-gray-500 outline-none focus:ring-3 transition-all';
    const variant = this.invalid()
      ? 'border-red-400 dark:border-red-500 focus:border-red-400 dark:focus:border-red-500 focus:ring-red-400/15'
      : 'border-gray-200 dark:border-gray-700 focus:border-violet-500 dark:focus:border-violet-400 focus:ring-violet-500/15 dark:focus:ring-violet-400/15';
    return `${base} ${variant}`;
  });

  writeValue(value: string): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (v: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  protected onInput(event: Event): void {
    this.value = (event.target as HTMLInputElement).value;
    this.onChange(this.value);
  }
}
