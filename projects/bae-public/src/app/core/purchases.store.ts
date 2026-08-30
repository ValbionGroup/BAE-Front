import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import type { Observable } from 'rxjs';
import { API_BASE_URL, messageOf } from '@bae/ui';

import type { LoadingStatus } from './catalog.models';

export interface MyPreOrderLine {
  readonly productId: number;
  readonly productName: string;
  readonly quantity: number;
  readonly receivedQuantity: number;
  readonly unitPrice: number;
}

export interface MyPreOrder {
  readonly id: number;
  readonly reference: string;
  readonly eventId: number;
  readonly eventName: string;
  readonly eventDate: string | null;
  readonly status: string;
  readonly lines: readonly MyPreOrderLine[];
  readonly totalCents: number;
  readonly paid: boolean;
  readonly fullyCollected: boolean;
  readonly pickupAt: string | null;
  readonly createdAt: string | null;
}

export interface MyCounterOrderLine {
  readonly productName: string;
  readonly quantity: number;
  /** En **centimes**, figé à la vente. */
  readonly unitPrice: number;
}

export interface MyCounterOrder {
  readonly id: number;
  /** Le numéro crié au comptoir, donc celui de la soirée. */
  readonly number: number;
  readonly eventId: number | null;
  readonly eventName: string;
  readonly eventDate: string | null;
  readonly status: string;
  readonly lines: readonly MyCounterOrderLine[];
  readonly totalCents: number;
  /** Remise et prise en charge cumulées : ce qui n'a pas été payé. */
  readonly savedCents: number;
  readonly createdAt: string | null;
}

export interface MySubscription {
  readonly fastPassId: number;
  readonly label: string;
  readonly subscribedAt: string;
  readonly expiresAt: string;
  readonly status: 'active' | 'expired';
  /** En **centimes**, comme `totalCents` d'une précommande. */
  readonly amount: number | null;
  readonly paymentMethod: string | null;
}

@Injectable({ providedIn: 'root' })
export class PurchasesStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _status = signal<LoadingStatus>('init');
  private readonly _subscriptionsStatus = signal<LoadingStatus>('init');
  private readonly _preOrders = signal<readonly MyPreOrder[]>([]);
  private readonly _subscriptions = signal<readonly MySubscription[]>([]);
  private readonly _orders = signal<readonly MyCounterOrder[]>([]);
  private readonly _error = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly preOrders = this._preOrders.asReadonly();
  readonly subscriptions = this._subscriptions.asReadonly();
  readonly orders = this._orders.asReadonly();
  readonly subscriptionsStatus = this._subscriptionsStatus.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isEmpty = computed(
    () =>
      this._preOrders().length === 0 &&
      this._subscriptions().length === 0 &&
      this._orders().length === 0,
  );

  readonly activeSubscription = computed<MySubscription | null>(
    () => this._subscriptions().find((row) => row.status === 'active') ?? null,
  );

  /**
   * La moitié « cotisations » seulement : l'en-tête en a besoin sur toutes les
   * pages, les précommandes n'intéressent que « Mes commandes ». Garde sur
   * `init` parce que le magasin est un singleton et l'en-tête permanent.
   */
  loadSubscriptions(): void {
    if (this._subscriptionsStatus() !== 'init') return;
    this._subscriptionsStatus.set('loading');

    this.fetchSubscriptions().subscribe({
      next: (subscriptions) => {
        this._subscriptions.set(subscriptions);
        this._subscriptionsStatus.set('loaded');
      },
      error: () => this._subscriptionsStatus.set('error'),
    });
  }

  load(): void {
    if (this._status() === 'loading') return;
    this._status.set('loading');
    this._error.set(null);

    const total = 3;
    let pending = total;
    let failures = 0;

    const settle = (failed: boolean): void => {
      if (failed) failures += 1;
      pending -= 1;
      if (pending > 0) return;
      this._status.set(failures === total ? 'error' : 'loaded');
    };

    this.track(
      this.http.get<MyPreOrder[]>(`${this.baseUrl}/account/pre-orders`),
      (rows) => this._preOrders.set(rows),
      'Vos commandes n’ont pas pu être chargées.',
      settle,
    );

    this.track(
      this.fetchSubscriptions(),
      (rows) => {
        this._subscriptions.set(rows);
        this._subscriptionsStatus.set('loaded');
      },
      'Vos cotisations n’ont pas pu être chargées.',
      settle,
    );

    this.track(
      this.http.get<MyCounterOrder[]>(`${this.baseUrl}/account/orders`),
      (rows) => this._orders.set(rows),
      'Vos achats au comptoir n’ont pas pu être chargés.',
      settle,
    );
  }

  /** L'échec d'une source n'emporte pas les autres : chacune se règle seule. */
  private track<T>(
    request: Observable<T>,
    apply: (rows: T) => void,
    failure: string,
    settle: (failed: boolean) => void,
  ): void {
    request.subscribe({
      next: (rows) => {
        apply(rows);
        settle(false);
      },
      error: (error: unknown) => {
        this._error.set(messageOf(error, failure));
        settle(true);
      },
    });
  }

  /** Après un échec : la garde d'`init` refuserait un second essai. */
  reloadSubscriptions(): void {
    this._subscriptionsStatus.set('init');
    this.loadSubscriptions();
  }

  private fetchSubscriptions(): Observable<readonly MySubscription[]> {
    return this.http.get<MySubscription[]>(`${this.baseUrl}/account/subscriptions`);
  }

  findPreOrder(id: number): MyPreOrder | null {
    return this._preOrders().find((preOrder) => preOrder.id === id) ?? null;
  }
}
