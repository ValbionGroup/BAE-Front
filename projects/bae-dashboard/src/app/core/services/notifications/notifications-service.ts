import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

/** `mail` et `in_app` sont les deux seuls canaux que `notifications.channel` accepte. */
export type NotificationChannel = 'mail' | 'in_app';

/**
 * Une livraison du fait à cette personne, sur un canal. `sentAt` n'a de sens que
 * pour `mail` : il reste `null` tant que `notify:dispatch` n'a pas vidé la file,
 * et c'est la seule chose qui distingue « parti » de « jamais parti ».
 */
export interface ApiNotificationDelivery {
  readonly channel: NotificationChannel;
  readonly sentAt: string | null;
}

/**
 * Une notification est la **projection personnelle** d'un événement métier : le
 * `verb` et le `payload` viennent de `activity_events`, `readAt` de la ligne de
 * livraison. Le flux global — le fil d'activité — lit la même source autrement.
 *
 * Une entrée porte **un fait**, pas une livraison : un fait envoyé à la fois dans
 * l'application et par mail arrive ici une seule fois, ses deux canaux dans
 * `channels`. Les lister séparément ferait croire à un double envoi.
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
  readonly channels: readonly ApiNotificationDelivery[];
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
