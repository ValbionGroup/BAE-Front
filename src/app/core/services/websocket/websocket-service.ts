import { Injectable } from '@angular/core';
import { Observable, Subject, Subscription, timer } from 'rxjs';
import { WsMessage } from '#core/models/ws-message.model';
import { Order, OrderStatus } from '#core/models/order.model';
import { environment } from '../../../../environment/environment';

@Injectable({
  providedIn: 'root',
})
export class WebsocketService {
  private readonly _messages$ = new Subject<WsMessage>();
  readonly messages$: Observable<WsMessage> = this._messages$.asObservable();

  private simulator?: Subscription;
  private simulatorOrderCounter = 100;

  initialize(userId: number): void {
    if (environment.production) return;

    // Emit a new pending order every 6–15 seconds
    const scheduleNext = (): void => {
      const delayMs = 6_000 + Math.random() * 9_000;
      this.simulator = timer(delayMs).subscribe(() => {
        this.emitSimulatedOrder(userId);
        scheduleNext();
      });
    };
    scheduleNext();
  }

  shutdown(): void {
    this.simulator?.unsubscribe();
    this.simulator = undefined;
  }

  publish(msg: WsMessage): void {
    this._messages$.next(msg);
  }

  private emitSimulatedOrder(userId: number): void {
    const recipePool = [
      { recipeId: 'r1', recipeName: 'Mojito' },
      { recipeId: 'r2', recipeName: 'Panaché' },
      { recipeId: 'r3', recipeName: 'Sangria' },
      { recipeId: 'r4', recipeName: 'Plateau apéro' },
      { recipeId: 'r5', recipeName: 'Vodka Orange' },
      { recipeId: 'r6', recipeName: 'Merguez frites' },
    ];

    const itemCount = 1 + Math.floor(Math.random() * 3);
    const items = Array.from({ length: itemCount }, () => {
      const recipe = recipePool[Math.floor(Math.random() * recipePool.length)];
      return {
        recipeId: recipe.recipeId,
        recipeName: recipe.recipeName,
        quantity: 1 + Math.floor(Math.random() * 3),
      };
    });

    const now = Date.now();
    const order: Order = {
      id: `sim-${userId}-${now}`,
      number: ++this.simulatorOrderCounter,
      eventId: 'e1', // matches the today-seeded active event
      items,
      status: 'pending' as OrderStatus,
      createdAt: now,
      updatedAt: now,
    };

    this._messages$.next({ type: 'order.created', payload: order });
  }
}
