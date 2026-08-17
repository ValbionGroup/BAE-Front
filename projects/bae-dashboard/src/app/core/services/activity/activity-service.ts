import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

/**
 * Un fait d'activité d'équipe. Le `payload` est **figé à l'émission** : il
 * raconte l'action telle qu'elle était, pas telle que les tables sont
 * aujourd'hui. Un fil qui relit ses sources réécrirait le passé.
 */
export interface ApiActivityEvent {
  readonly id: number;
  readonly verb: string;
  readonly subjectType: string;
  readonly subjectId: number;
  /** `null` seulement si le compte a été supprimé — le serveur exclut déjà les faits sans auteur. */
  readonly actorName: string | null;
  readonly payload: Record<string, unknown>;
  readonly occurredAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(): Observable<ApiActivityEvent[]> {
    return this.http.get<ApiActivityEvent[]>(`${this.baseUrl}/activity`);
  }
}
