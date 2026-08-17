import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Transmit, type Subscription } from '@adonisjs/transmit-client';
import { WsMessage } from '#core/models/ws-message.model';
import { toOrder, type ApiOrder } from '#core/services/orders/orders-service';
import type { PreOrderTicket } from '#core/models/pre-order.model';
import { API_BASE_URL } from '@bae/ui';

/**
 * Formes diffusées par le back (`orders_realtime.ts`) sur le canal d'une soirée.
 *
 * ⚠️ La charge utile ne s'appelle pas pareil selon l'événement (`order` contre
 * `preOrder`) : lire aveuglément `message.order` sur une diffusion de
 * précommande donnait un `undefined` qui explosait dans `toOrder`.
 */
type OrdersBroadcast =
  | {
      readonly event: 'order.created' | 'order.updated' | 'order.cancelled';
      readonly order: ApiOrder;
    }
  | { readonly event: 'pre_order.updated'; readonly preOrder: PreOrderTicket };

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _messages$ = new Subject<WsMessage>();
  readonly messages$: Observable<WsMessage> = this._messages$.asObservable();

  private transmit?: Transmit;
  private readonly subscriptions = new Map<string, Subscription>();

  /** `EventSource` n'existe ni sous jsdom ni en rendu serveur. */
  isSupported(): boolean {
    return typeof globalThis !== 'undefined' && 'EventSource' in globalThis;
  }

  initialize(): void {
    if (this.transmit || !this.isSupported()) return;

    // ⚠️ Plus aucun en-tête à poser : le jeton vit dans un cookie `httpOnly`.
    // Transmit crée déjà ses requêtes avec `credentials: 'include'` et son
    // `EventSource` avec `withCredentials: true` — le cookie part donc seul, y
    // compris vers une autre origine. Les hooks `beforeSubscribe` /
    // `beforeUnsubscribe` n'ont plus d'objet et ont été retirés.
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
      this._messages$.next(
        message.event === 'pre_order.updated'
          ? { type: message.event, payload: message.preOrder }
          : { type: message.event, payload: toOrder(message.order) },
      );
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
