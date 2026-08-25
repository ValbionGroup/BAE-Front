import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Transmit, type Subscription } from '@adonisjs/transmit-client';
import { WsMessage } from '#core/models/ws-message.model';
import { toOrder, type ApiOrder } from '#core/services/orders/orders-service';
import type { PreOrderTicket } from '#core/models/pre-order.model';
import type { CardPaymentStatus } from '#core/services/payments/card-payments-service';
import { API_BASE_URL } from '@bae/ui';

/** Formes diffusées par le back (`orders_realtime.ts`) sur le canal d'une soirée. */
type OrdersBroadcast =
  | {
      readonly event: 'order.created' | 'order.updated' | 'order.cancelled';
      readonly order: ApiOrder;
    }
  | { readonly event: 'pre_order.updated'; readonly preOrder: PreOrderTicket }
  | {
      readonly event: 'card_payment.updated';
      readonly cardPayment: { orderRef: string; status: CardPaymentStatus };
      readonly order: ApiOrder | null;
    };

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _messages$ = new Subject<WsMessage>();
  readonly messages$: Observable<WsMessage> = this._messages$.asObservable();

  private transmit?: Transmit;
  private readonly subscriptions = new Map<string, Subscription>();

  isSupported(): boolean {
    return typeof globalThis !== 'undefined' && 'EventSource' in globalThis;
  }

  initialize(): void {
    if (this.transmit || !this.isSupported()) return;

    this.transmit = new Transmit({
      baseUrl: this.baseUrl.replace(/\/v1$/, ''),
    });
  }

  shutdown(): void {
    for (const subscription of this.subscriptions.values()) {
      void subscription.delete();
    }
    this.subscriptions.clear();
    this.transmit?.close();
    this.transmit = undefined;
  }

  async subscribeToEvent(eventId: string): Promise<void> {
    this.initialize();
    if (!this.transmit || this.subscriptions.has(eventId)) return;

    const channel = `events/${eventId}/orders`;
    const subscription = this.transmit!.subscription(channel);
    this.subscriptions.set(eventId, subscription);

    await subscription.create();

    subscription.onMessage<OrdersBroadcast>((message) => {
      if (message.event === 'pre_order.updated') {
        this._messages$.next({ type: message.event, payload: message.preOrder });
        return;
      }
      if (message.event === 'card_payment.updated') {
        this._messages$.next({
          type: message.event,
          payload: {
            ...message.cardPayment,
            order: message.order ? toOrder(message.order) : null,
          },
        });
        return;
      }
      this._messages$.next({ type: message.event, payload: toOrder(message.order) });
    });
  }

  async unsubscribeFromEvent(eventId: string): Promise<void> {
    const subscription = this.subscriptions.get(eventId);
    if (!subscription) return;
    this.subscriptions.delete(eventId);
    await subscription.delete();
  }

  publish(msg: WsMessage): void {
    this._messages$.next(msg);
  }
}
