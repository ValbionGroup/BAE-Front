import { Injectable, signal } from '@angular/core';
import { DropdownConfig, OpenDropdown } from './dropdown.models';

/**
 * Singleton dropdown / context-menu controller. Only one dropdown is open at
 * a time (clicking outside or opening a new one closes the previous).
 */
@Injectable({ providedIn: 'root' })
export class DropdownService {
  private readonly _current = signal<OpenDropdown | null>(null);

  readonly current = this._current.asReadonly();

  open(config: DropdownConfig): string {
    const id = crypto.randomUUID();
    this._current.set({ id, ...config });
    return id;
  }

  close(id?: string): void {
    const cur = this._current();
    if (!cur) return;
    if (id === undefined || cur.id === id) {
      this._current.set(null);
    }
  }

  /**
   * Open a dropdown, or close it if the same anchor is already open.
   * Lets callers wire a single click handler to a button without tracking state.
   */
  toggle(config: DropdownConfig): void {
    const cur = this._current();
    if (cur && cur.anchor === config.anchor) {
      this._current.set(null);
      return;
    }
    this.open(config);
  }
}
