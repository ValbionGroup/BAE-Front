import { Injectable, TemplateRef, signal } from '@angular/core';

export interface PageHeader {
  title: string;
  subtitle?: string;
  breadcrumb?: readonly string[];
  activeNavId?: string;
}

@Injectable({ providedIn: 'root' })
export class PageHeaderService {
  private readonly _header = signal<PageHeader | null>(null);
  private readonly _actions = signal<TemplateRef<unknown> | null>(null);

  readonly header = this._header.asReadonly();
  readonly actions = this._actions.asReadonly();

  set(header: PageHeader): void {
    this._header.set(header);
    // Reset actions when a new page takes over; pages with actions
    // re-push their template via setActions() after view init.
    this._actions.set(null);
  }

  setActions(tpl: TemplateRef<unknown> | null): void {
    this._actions.set(tpl);
  }

  clear(): void {
    this._header.set(null);
    this._actions.set(null);
  }
}
