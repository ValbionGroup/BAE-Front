import { Injectable, signal } from '@angular/core';
import { OpenTooltip, TooltipConfig } from './tooltip.models';

/**
 * Singleton tooltip controller. Only one tooltip is visible at a time;
 * hovering a new anchor replaces the active tooltip.
 */
@Injectable({ providedIn: 'root' })
export class TooltipService {
  private readonly _current = signal<OpenTooltip | null>(null);

  readonly current = this._current.asReadonly();

  show(config: TooltipConfig): string {
    const id = crypto.randomUUID();
    this._current.set({ id, ...config });
    return id;
  }

  hide(id?: string): void {
    const cur = this._current();
    if (!cur) return;
    if (id === undefined || cur.id === id) this._current.set(null);
  }
}
