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
    <div [class]="wrapperClasses()">
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
        class="flex-1 bg-transparent border-none outline-none text-text text-[13px] min-w-0 placeholder:text-muted"
      />
    </div>
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

  protected wrapperClasses = computed(() => {
    const base =
      'flex items-center gap-2 h-9 px-3 bg-surface-2 rounded-md border text-text text-[13px]';
    const borderClass = this.invalid() ? 'border-danger' : 'border-border';
    return `${base} ${borderClass}`;
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
