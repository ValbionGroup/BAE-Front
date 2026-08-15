import { inject, Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Transmit, type Subscription } from '@adonisjs/transmit-client';
import { WsMessage } from '#core/models/ws-message.model';
import { toOrder, type ApiOrder } from '#core/services/orders/orders-service';
import { TokensService } from '#core/services/tokens/tokens-service';
import { API_BASE_URL } from '#core/tokens/api-url.token';

/** Forme diffusée par le back (`orders_realtime.ts`). */
interface OrdersBroadcast {
  readonly event: WsMessage['type'];
  readonly order: ApiOrder;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private readonly tokens = inject(TokensService);
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

    // Le flux SSE lui-même ne peut pas porter d'en-tête (`EventSource`), mais
    // `subscribe`/`unsubscribe` sont de vraies requêtes : c'est là que le jeton
    // passe, et c'est là que le back filtre.
    this.transmit = new Transmit({
      baseUrl: this.baseUrl.replace(/\/v1$/, ''),
      beforeSubscribe: (request) => void this.authorize(request),
      beforeUnsubscribe: (request) => void this.authorize(request),
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
      this._messages$.next({
        type: message.event,
        payload: toOrder(message.order),
      } as WsMessage);
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

  private async authorize(request: Request): Promise<void> {
    const token = await this.tokens.getValidAccessToken();
    if (token) request.headers.set('Authorization', `Bearer ${token}`);
  }
}
