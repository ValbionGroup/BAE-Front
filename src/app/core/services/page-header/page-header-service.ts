import { Injectable, signal } from '@angular/core';

export interface PageHeader {
  title: string;
  subtitle?: string;
  breadcrumb?: readonly string[];
  activeNavId?: string;
}

@Injectable({ providedIn: 'root' })
export class PageHeaderService {
  private readonly _header = signal<PageHeader | null>(null);

  readonly header = this._header.asReadonly();

  set(header: PageHeader): void {
    this._header.set(header);
  }

  clear(): void {
    this._header.set(null);
  }
}
