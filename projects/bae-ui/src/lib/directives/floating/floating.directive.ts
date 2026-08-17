import { Directive, ElementRef, effect, inject, input } from '@angular/core';
import {
  autoUpdate,
  computePosition,
  flip,
  offset as offsetMiddleware,
  shift,
  type Placement,
} from '@floating-ui/dom';

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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    effect((onCleanup) => {
      const anchor = this.anchor();
      const placement = this.placement();
      const distance = this.distance();
      const floating = this.host.nativeElement;
      if (!anchor) return;

      Object.assign(floating.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        zIndex: '40',
        maxWidth: 'max-content',
      });

      const update = (): void => {
        computePosition(anchor, floating, {
          placement,
          middleware: [offsetMiddleware(distance), flip(), shift({ padding: 8 })],
        }).then(({ x, y }) => {
          floating.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
        });
      };

      onCleanup(autoUpdate(anchor, floating, update));
    });
  }
}
