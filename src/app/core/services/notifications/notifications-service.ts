import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

/**
 * Une notification est la **projection personnelle** d'un événement métier : le
 * `verb` et le `payload` viennent de `activity_events`, `readAt` de la ligne de
 * livraison. Le flux global — le fil d'activité — lit la même source autrement.
 */
export interface ApiNotification {
  readonly id: number;
  /** `presence.pending`, `presence.upcoming`, `ticket.opened`… */
  readonly verb: string;
  readonly subjectType: string;
  readonly subjectId: number;
  /** Figé à l'émission : raconte le fait tel qu'il était, pas tel qu'il est. */
  readonly payload: Record<string, unknown>;
  readonly occurredAt: string | null;
  readonly readAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class NotificationsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Les siennes, et seulement les siennes : le serveur filtre sur le porteur du jeton. */
  list(): Observable<ApiNotification[]> {
    return this.http.get<ApiNotification[]>(`${this.baseUrl}/account/notifications`);
  }

  markRead(id: number): Observable<{ id: number; readAt: string | null }> {
    return this.http.patch<{ id: number; readAt: string | null }>(
      `${this.baseUrl}/account/notifications/${id}/read`,
      {},
    );
  }

  markAllRead(): Observable<{ updated: number }> {
    return this.http.post<{ updated: number }>(
      `${this.baseUrl}/account/notifications/read-all`,
      {},
    );
  }
}
