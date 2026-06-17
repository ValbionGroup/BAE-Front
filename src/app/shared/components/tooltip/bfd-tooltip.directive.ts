import { Directive, ElementRef, OnDestroy, inject, input } from '@angular/core';
import type { Placement } from '@floating-ui/dom';
import { TooltipService } from './tooltip.service';

/**
 * Attach a global tooltip to any element. Triggers on hover and focus,
 * dismisses on leave and blur.
 *
 *   <button bfdTooltip="Lancer l'algo">…</button>
 *   <button bfdTooltip="Notifications" bfdTooltipPlacement="bottom-end">…</button>
 */
@Directive({
  selector: '[bfdTooltip]',
  host: {
    '(mouseenter)': 'open()',
    '(mouseleave)': 'close()',
    '(focusin)': 'open()',
    '(focusout)': 'close()',
  },
})
export class BfdTooltip implements OnDestroy {
  readonly title = input.required<string>({ alias: 'bfdTooltip' });
  readonly description = input<string>('', { alias: 'bfdTooltipDescription' });
  readonly placement = input<Placement>('top', { alias: 'bfdTooltipPlacement' });
  readonly delay = input<number>(250, { alias: 'bfdTooltipDelay' });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly service = inject(TooltipService);
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private activeId: string | null = null;

  protected open(): void {
    this.clearTimer();
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      const text = this.title();
      if (!text) return;
      this.activeId = this.service.show({
        anchor: this.host.nativeElement,
        title: text,
        description: this.description() || undefined,
        placement: this.placement(),
      });
    }, this.delay());
  }

  protected close(): void {
    this.clearTimer();
    if (this.activeId) {
      this.service.hide(this.activeId);
      this.activeId = null;
    }
  }

  ngOnDestroy(): void {
    this.close();
  }

  private clearTimer(): void {
    if (this.showTimer) {
      clearTimeout(this.showTimer);
      this.showTimer = null;
    }
  }
}
