import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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

export interface MySubscription {
  readonly fastPassId: number;
  readonly label: string;
  readonly subscribedAt: string;
  readonly expiresAt: string;
  readonly status: 'active' | 'expired';
  readonly amount: number | null;
  readonly paymentMethod: string | null;
}

@Injectable({ providedIn: 'root' })
export class PurchasesStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _status = signal<LoadingStatus>('init');
  private readonly _preOrders = signal<readonly MyPreOrder[]>([]);
  private readonly _subscriptions = signal<readonly MySubscription[]>([]);
  private readonly _error = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly preOrders = this._preOrders.asReadonly();
  readonly subscriptions = this._subscriptions.asReadonly();
  readonly error = this._error.asReadonly();

  readonly isEmpty = computed(
    () => this._preOrders().length === 0 && this._subscriptions().length === 0,
  );

  load(): void {
    if (this._status() === 'loading') return;
    this._status.set('loading');
    this._error.set(null);

    let pending = 2;
    let failures = 0;

    const settle = (): void => {
      pending -= 1;
      if (pending > 0) return;
      this._status.set(failures === 2 ? 'error' : 'loaded');
    };

    this.http.get<MyPreOrder[]>(`${this.baseUrl}/account/pre-orders`).subscribe({
      next: (preOrders) => {
        this._preOrders.set(preOrders);
        settle();
      },
      error: (error: unknown) => {
        failures += 1;
        this._error.set(messageOf(error, 'Vos commandes n’ont pas pu être chargées.'));
        settle();
      },
    });

    this.http.get<MySubscription[]>(`${this.baseUrl}/account/subscriptions`).subscribe({
      next: (subscriptions) => {
        this._subscriptions.set(subscriptions);
        settle();
      },
      error: (error: unknown) => {
        failures += 1;
        this._error.set(messageOf(error, 'Vos cotisations n’ont pas pu être chargées.'));
        settle();
      },
    });
  }

  findPreOrder(id: number): MyPreOrder | null {
    return this._preOrders().find((preOrder) => preOrder.id === id) ?? null;
  }
}
