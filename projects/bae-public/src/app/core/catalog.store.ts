import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, messageOf } from '@bae/ui';

import type {
  LoadingStatus,
  PublicEvent,
  PublicFastPass,
  PublicFastPassCatalog,
  PublicMenu,
} from './catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _eventsStatus = signal<LoadingStatus>('init');
  private readonly _events = signal<readonly PublicEvent[]>([]);
  private readonly _menuStatus = signal<LoadingStatus>('init');
  private readonly _menu = signal<PublicMenu | null>(null);
  private readonly _passesStatus = signal<LoadingStatus>('init');
  private readonly _passes = signal<readonly PublicFastPass[]>([]);
  private readonly _bonusPercent = signal(0);
  private readonly _error = signal<string | null>(null);

  readonly eventsStatus = this._eventsStatus.asReadonly();
  readonly events = this._events.asReadonly();
  readonly menuStatus = this._menuStatus.asReadonly();
  readonly menu = this._menu.asReadonly();
  readonly passesStatus = this._passesStatus.asReadonly();
  readonly passes = this._passes.asReadonly();
  readonly bonusPercent = this._bonusPercent.asReadonly();
  readonly error = this._error.asReadonly();

  readonly featured = computed<PublicEvent | null>(
    () => this._events().find((event) => event.open) ?? this._events()[0] ?? null,
  );

  readonly openCount = computed(() => this._events().filter((event) => event.open).length);

  loadEvents(): void {
    if (this._eventsStatus() === 'loading') return;
    this._eventsStatus.set('loading');

    this.http.get<PublicEvent[]>(`${this.baseUrl}/public/events`).subscribe({
      next: (events) => {
        this._events.set(events);
        this._eventsStatus.set('loaded');
      },
      error: (error: unknown) => {
        this._error.set(messageOf(error, 'Les soirées n’ont pas pu être chargées.'));
        this._eventsStatus.set('error');
      },
    });
  }

  loadMenu(eventId: number): void {
    if (this._menuStatus() === 'loading') return;
    if (this._menu()?.event.id === eventId && this._menuStatus() === 'loaded') return;

    this._menuStatus.set('loading');

    this.http.get<PublicMenu>(`${this.baseUrl}/public/events/${eventId}/menu`).subscribe({
      next: (menu) => {
        this._menu.set(menu);
        this._menuStatus.set('loaded');
      },
      error: (error: unknown) => {
        this._error.set(messageOf(error, 'Le menu n’a pas pu être chargé.'));
        this._menuStatus.set('error');
      },
    });
  }

  loadFastPasses(): void {
    if (this._passesStatus() === 'loading' || this._passesStatus() === 'loaded') return;
    this._passesStatus.set('loading');

    this.http.get<PublicFastPassCatalog>(`${this.baseUrl}/public/fast-passes`).subscribe({
      next: (catalog) => {
        this._passes.set(catalog.plans);
        this._bonusPercent.set(catalog.bonusPercent);
        this._passesStatus.set('loaded');
      },
      error: (error: unknown) => {
        this._error.set(messageOf(error, 'Les formules n’ont pas pu être chargées.'));
        this._passesStatus.set('error');
      },
    });
  }
}
