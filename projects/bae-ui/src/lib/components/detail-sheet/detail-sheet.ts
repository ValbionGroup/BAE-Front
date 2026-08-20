import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { LucideX } from '@lucide/angular';

/**
 * Panneau de détail responsive : feuille ancrée en bas sous `md`, colonne de droite
 * au-dessus.
 *
 * `open` ne pilote que le mobile — au-dessus de `md` le panneau reste affiché en
 * permanence et montre son propre état vide, comme un maître/détail classique.
 */
@Component({
  selector: 'bae-detail-sheet',
  imports: [LucideX],
  templateUrl: './detail-sheet.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    // L'hôte s'intercale entre la grille de la page et le panneau : sans `h-full` sur
    // les deux, l'aside retombe en hauteur automatique et les `h-full` internes (donc
    // le défilement du panneau) ne se résolvent plus.
    class: 'block min-h-0 md:h-full',
    '(document:keydown.escape)': 'onEscape()',
  },
})
export class DetailSheet {
  readonly open = input<boolean>(false);
  readonly title = input<string>('');

  readonly closed = output<void>();

  /** `translate-y` plutôt que `height` : une transition sur `height` ne peut pas être
   *  composée par le GPU et saccade sur un téléphone d'entrée de gamme. */
  protected readonly panelClass = computed(
    () =>
      'fixed inset-x-0 bottom-0 z-40 flex max-h-[85dvh] flex-col overflow-y-auto ' +
      'rounded-t-xl border-t border-border-s bg-surface shadow-[0_-8px_40px_rgba(0,0,0,.35)] ' +
      'transition-transform duration-200 md:static md:z-auto md:h-full md:max-h-none md:rounded-none ' +
      'md:border-l md:border-t-0 md:shadow-none md:transition-none ' +
      (this.open() ? 'translate-y-0' : 'translate-y-full md:translate-y-0'),
  );

  protected onClose(): void {
    this.closed.emit();
  }

  protected onEscape(): void {
    if (this.open()) {
      this.closed.emit();
    }
  }
}
