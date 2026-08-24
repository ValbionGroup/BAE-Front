import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  EventApiDto,
  EventData,
  EventDetail,
  Presence,
  RosterRow,
  RosterRowApiDto,
} from '#core/models/event.model';
import { API_BASE_URL } from '@bae/ui';
import { ApiEndPointV1 } from '#core/models/endpoint.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  fetchAll(): Observable<EventDetail[]> {
    const url = this.buildUrl(ApiEndPointV1.EVENTS);
    return this.http
      .get<EventApiDto[]>(url)
      .pipe(map((dtos) => dtos.map((d) => this.toEventData(d))));
  }

  fetchRosterForEvent(id: string): Observable<RosterRow[]> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_ROSTER).replace(':id', id);
    return this.http
      .get<RosterRowApiDto[]>(url)
      .pipe(map((dtos) => dtos.map((d) => this.toRosterRow(d))));
  }

  fetchPresenceForEvent(id: string): Observable<EventDetail['memberPresence']> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_MEMBER_RESPONSE).replace(':id', id);
    return this.http.get<EventDetail['memberPresence']>(url);
  }

  updatePresenceForEvent(
    id: string,
    presence: Presence,
  ): Observable<EventDetail['memberPresence']> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_MEMBER_RESPONSE).replace(':id', id);
    return this.http.post<EventDetail['memberPresence']>(url, { isAvailable: presence });
  }

  /**
   * Seuls les deux champs dont la forme change sont écrits ici ; le reste passe
   * tel quel. Recopier champ par champ, c'était accepter qu'un ajout au modèle
   * n'arrive jamais jusqu'au store — les champs étant optionnels, l'oubli ne
   * levait aucune erreur.
   *
   * Conséquence assumée : ce que l'API sert en plus (`createdAt`, `updatedAt`)
   * entre désormais dans le store. Rien ne l'y lit et rien n'y renvoie une
   * soirée à l'API, donc ces clés y dorment.
   *
   * ⚠️ `id` est normalisé en chaîne : l'API sert l'entier de la clé primaire, et
   * sans cela toute comparaison stricte avec un identifiant venu d'ailleurs
   * échouait en silence.
   */
  private toEventData({ id, date, ...rest }: EventApiDto): EventData {
    return { ...rest, id: String(id), date: new Date(date) };
  }

  private toRosterRow({ when, ...rest }: RosterRowApiDto): RosterRow {
    return { ...rest, when: new Date(when) };
  }

  private buildUrl(endpoint: ApiEndPointV1): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
