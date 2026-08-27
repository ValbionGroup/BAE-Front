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

/**
 * Le pendant de `SIZE_CLASSES` quand le libellé a le droit de passer à la ligne :
 * la hauteur devient un **minimum** et le rembourrage vertical prend le relais.
 * Garder `h-*` ferait déborder le texte hors du bouton au lieu de l'agrandir.
 */
const SIZE_WRAP_CLASSES: Record<BtnSize, string> = {
  sm: 'min-h-7 px-2.5 py-1 text-xs gap-1.5',
  md: 'min-h-[34px] px-3 py-1.5 text-[13px] gap-1.5',
  lg: 'min-h-[42px] px-4 py-2 text-sm gap-2',
  xl: 'min-h-14 px-[22px] py-3 text-base gap-2.5',
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
  'inline-flex items-center justify-center font-medium rounded-md cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue/40 disabled:opacity-40 disabled:cursor-not-allowed';

@Component({
  selector: 'bae-btn',
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

  /**
   * Autorise le libellé à passer à la ligne, et le bouton à grandir avec lui.
   *
   * Par défaut un bouton ne se coupe pas : c'est le bon choix pour un libellé
   * court, qui doit rester sur une ligne quitte à élargir son conteneur. Mais un
   * bouton `full` porte une largeur imposée : son libellé ne peut plus élargir
   * quoi que ce soit, et un texte long **déborde vers la droite** au lieu de
   * s'adapter. C'est ce qui arrivait à « Se connecter avec EirbConnect » sous
   * 390 px de large.
   */
  readonly wrap = input<boolean>(false);
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
    const wrap = this.wrap();
    const parts = [
      BASE_CLASSES,
      KIND_CLASSES[this.kind()],
      wrap ? SIZE_WRAP_CLASSES[this.size()] : SIZE_CLASSES[this.size()],
      wrap ? 'whitespace-normal text-center' : 'whitespace-nowrap',
    ];
    if (this.full()) {
      parts.push('w-full');
    }
    return parts.join(' ');
  });

  onClick(event: MouseEvent): void {
    this.clicked.emit(event);
  }
}
