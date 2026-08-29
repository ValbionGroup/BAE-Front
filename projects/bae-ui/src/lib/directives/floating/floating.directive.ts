import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import {
  arrow as arrowMiddleware,
  autoUpdate,
  computePosition,
  flip,
  offset as offsetMiddleware,
  shift,
  type Middleware,
  type Placement,
} from '@floating-ui/dom';

/** Le côté du flottant où la flèche se plante, déduit du placement retenu. */
const OPPOSITE_SIDE: Record<string, 'top' | 'right' | 'bottom' | 'left'> = {
  top: 'bottom',
  right: 'left',
  bottom: 'top',
  left: 'right',
};

/**
 * Positions the host element next to an anchor element using Floating UI.
 *
 * Usage:
 *   <button #trigger>Open</button>
 *   @if (open()) {
 *     <div [baeFloating]="trigger" baePlacement="bottom-end">...</div>
 *   }
 */
@Directive({
  selector: '[baeFloating]',
})
export class FloatingDirective {
  readonly anchor = input.required<HTMLElement | null>({ alias: 'baeFloating' });
  readonly placement = input<Placement>('bottom-end', { alias: 'baePlacement' });
  readonly distance = input<number>(6, { alias: 'baeDistance' });

  /**
   * Élément à planter dans le bord du flottant, côté ancre.
   *
   * ⚠️ Il doit être en `position: absolute` et **carré** : Floating UI ne pose
   * qu'un décalage sur un axe, la moitié de la diagonale d'un carré tourné à 45°
   * détermine seule l'enfoncement. Un rectangle dépasserait d'un côté.
   *
   * Facultatif : sans lui, le placement se comporte exactement comme avant.
   */
  readonly arrow = input<HTMLElement | null>(null, { alias: 'baeArrow' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect((onCleanup) => {
      const anchor = this.anchor();
      const placement = this.placement();
      const distance = this.distance();
      const arrow = this.arrow();
      const floating = this.host.nativeElement;
      if (!anchor) return;

      Object.assign(floating.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '40',
        maxWidth: 'max-content',
      });

      // `arrow` vient **après** `shift` : il mesure le décalage que shift a
      // appliqué pour recentrer la flèche sur l'ancre. Placé avant, il lirait
      // une position que le middleware suivant invalide aussitôt.
      const middleware: Middleware[] = [offsetMiddleware(distance), flip(), shift({ padding: 8 })];
      if (arrow) middleware.push(arrowMiddleware({ element: arrow }));

      const update = (): void => {
        computePosition(anchor, floating, { placement, middleware }).then((position) => {
          floating.style.transform = `translate(${Math.round(position.x)}px, ${Math.round(position.y)}px)`;
          if (!arrow) return;

          // `flip()` peut retourner le flottant : la flèche suit le placement
          // **retenu**, pas celui demandé.
          const side = OPPOSITE_SIDE[position.placement.split('-')[0]];
          const { x: arrowX, y: arrowY } = position.middlewareData.arrow ?? {};

          Object.assign(arrow.style, {
            left: arrowX === undefined ? '' : `${Math.round(arrowX)}px`,
            top: arrowY === undefined ? '' : `${Math.round(arrowY)}px`,
            right: '',
            bottom: '',
            [side]: `${-arrow.offsetWidth / 2}px`,
          });
        });
      };

      onCleanup(autoUpdate(anchor, floating, update));
    });
  }
}
