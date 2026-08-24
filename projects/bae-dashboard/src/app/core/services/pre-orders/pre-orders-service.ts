import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';
import type { PreOrderTicket } from '#core/models/pre-order.model';
import type { OrderStatus } from '#core/models/order.model';

@Injectable({ providedIn: 'root' })
export class PreOrdersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(eventId: string): Observable<PreOrderTicket[]> {
    return this.http.get<PreOrderTicket[]>(`${this.baseUrl}/events/${eventId}/pre-orders`);
  }

  setStatus(preOrderId: number, status: OrderStatus): Observable<PreOrderTicket> {
    return this.http.patch<PreOrderTicket>(`${this.baseUrl}/pre-orders/${preOrderId}/status`, {
      status,
    });
  }

  /**
   * Pose, déplace ou retire le créneau de retrait.
   *
   * `null` **retire** le créneau — ce n'est pas « ne rien changer » : la
   * commande repasse alors en tête de file, faute d'heure annoncée.
   */
  setPickup(preOrderId: number, pickupAt: string | null): Observable<PreOrderTicket> {
    return this.http.patch<PreOrderTicket>(`${this.baseUrl}/pre-orders/${preOrderId}/pickup`, {
      pickupAt,
    });
  }

  /**
   * Remet la commande au client, en totalité.
   *
   * ⚠️ C'est ce geste-ci — pas `setStatus('completed')` — qui doit clore une
   * précommande : lui seul écrit `received_quantity`. Passer par le statut
   * marquerait le ticket fini sans que rien n'ait changé de mains.
   */
  collect(preOrderId: number): Observable<PreOrderTicket> {
    return this.http.post<PreOrderTicket>(`${this.baseUrl}/pre-orders/${preOrderId}/collect`, {});
  }
}
