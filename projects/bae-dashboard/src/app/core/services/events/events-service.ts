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

/** Ce que `POST /events/:id/settle` rend : le compte de la consolidation. */
export interface SettleSummary {
  /** Affectations consolidées par cet appel. `0` = déjà clôturée. */
  readonly settled: number;
  readonly alreadySettled: number;
  readonly totalDelta: number;
  readonly status: 'completed';
}

/**
 * ⚠️ **`new Date(null)` vaut le 1ᵉʳ janvier 1970, pas une date invalide.** La
 * coercition de `null` en `0` fait d'une soirée sans date la plus ancienne de
 * toutes — donc la gagnante de `earliest()`. Le garde-fou `isValidDate` de
 * `EventsStore` était écrit pour ce cas et ne l'attrapait pas : il ne voyait
 * qu'une date parfaitement valide.
 *
 * `undefined` et la chaîne vide donnent bien `Invalid Date` ; seul `null` ment.
 */
function parseEventDate(date: string | null | undefined): Date {
  return date === null || date === undefined ? new Date(Number.NaN) : new Date(date);
}

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

  /**
   * Ouvre la soirée — `status: 'ongoing'`.
   *
   * ⚠️ Le serveur refuse en 409 (`E_EVENT_ALREADY_OPEN`) s'il en existe déjà une
   * ouverte, et (`E_EVENT_CLOSED`) si celle-ci est clôturée. Les deux portent un
   * message lisible : l'appelant doit l'afficher, pas l'avaler.
   */
  open(id: string): Observable<EventData> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_OPEN).replace(':id', id);
    return this.http.post<EventApiDto>(url, {}).pipe(map((dto) => this.toEventData(dto)));
  }

  /**
   * Clôture la soirée : consolide les points **et** passe `status: 'completed'`.
   * Un seul appel, idempotent — le serveur fait les deux dans la même
   * transaction. La marche arrière est `node ace event:unsettle`.
   */
  settle(id: string): Observable<SettleSummary> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_SETTLE).replace(':id', id);
    return this.http.post<SettleSummary>(url, {});
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
    return { ...rest, id: String(id), date: parseEventDate(date) };
  }

  private toRosterRow({ when, ...rest }: RosterRowApiDto): RosterRow {
    return { ...rest, when: new Date(when) };
  }

  private buildUrl(endpoint: ApiEndPointV1): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
