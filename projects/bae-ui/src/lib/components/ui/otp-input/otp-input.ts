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

const BOX_BASE =
  'mono relative flex h-10 w-10 items-center justify-center rounded-md border bg-surface-2 text-[17px] font-medium text-text';

@Component({
  selector: 'bae-otp-input',
  templateUrl: './otp-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OtpInput),
      multi: true,
    },
  ],
  host: { '[attr.id]': 'null' },
})
export class OtpInput implements ControlValueAccessor {
  readonly length = input<number>(6);
  readonly invalid = input<boolean>(false);
  readonly disabled = input<boolean>(false);

  /** Transmis au `<input>` interne — voir `bae-input`, même raison. */
  readonly id = input<string | null>(null);
  readonly ariaLabel = input<string | null>(null);

  /**
   * L'id du message d'erreur. L'annonce reste au consommateur : un
   * `role="alert"` interne se déclencherait à chaque rendu, alors que seule la
   * page sait qu'un code vient d'être refusé.
   */
  readonly errorId = input<string | null>(null);

  /**
   * Émis à chaque frappe, comme `bae-input` : les deux modes coexistent pour que
   * le composant serve aussi bien dans un formulaire réactif que piloté par un
   * simple signal.
   */
  readonly valueChange = output<string>();

  /** Émis une seule fois, quand la longueur attendue est atteinte. */
  readonly completed = output<string>();

  protected readonly value = signal('');
  protected readonly focused = signal(false);
  protected isDisabled = false;

  private onChange: (v: string) => void = () => {};
  protected onTouched: () => void = () => {};

  protected readonly slots = computed(() =>
    Array.from({ length: this.length() }, (_, index) => index),
  );

  /**
   * La case que la prochaine frappe remplira. Bornée à la dernière case pour que
   * le code complet garde un repère visible au lieu de n'en avoir aucun.
   */
  private readonly activeIndex = computed(() => Math.min(this.value().length, this.length() - 1));

  protected digitAt(index: number): string {
    return this.value()[index] ?? '';
  }

  protected boxClass(index: number): string {
    if (this.invalid()) return `${BOX_BASE} border-danger`;
    if (index < this.value().length) return `${BOX_BASE} border-blue`;
    if (this.focused() && index === this.activeIndex()) {
      return `${BOX_BASE} border-blue ring-2 ring-blue/30`;
    }
    return `${BOX_BASE} border-border`;
  }

  writeValue(value: string): void {
    this.value.set(this.sanitise(value ?? ''));
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

  protected onBlur(): void {
    this.focused.set(false);
    this.onTouched();
  }

  protected onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    const cleaned = this.sanitise(element.value);

    /**
     * ⚠️ On réécrit le DOM, pas seulement le modèle : `inputmode="numeric"` est
     * une indication pour le clavier logiciel, pas une contrainte de saisie. Un
     * collage de « 482 156 » ou une frappe au clavier physique arrivent tels
     * quels, et sans cette réécriture le champ et la valeur divergeraient.
     */
    if (element.value !== cleaned) element.value = cleaned;

    this.value.set(cleaned);
    this.onChange(cleaned);
    this.valueChange.emit(cleaned);

    if (cleaned.length === this.length()) this.completed.emit(cleaned);
  }

  private sanitise(raw: string): string {
    return raw.replace(/\D/g, '').slice(0, this.length());
  }
}
