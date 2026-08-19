import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

export interface OpenedTicket {
  readonly id: number;
  readonly subject: string;
  readonly status: string;
}

/**
 * Ouvrir un ticket depuis la zone publique.
 *
 * ⚠️ Le corps ne porte **ni nom ni email** : `tickets` n'a pas ces colonnes,
 * l'auteur est déduit de la session par `author_id`. Les envoyer serait accepté
 * puis silencieusement ignoré par le validateur, et la page laisserait croire
 * qu'ils voyagent avec le message.
 *
 * `POST /v1/tickets` exige une session — sans `audience()`, donc un client y a
 * droit au même titre qu'un membre, mais un anonyme reçoit un 401.
 */
@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  open(input: { subject: string; body: string }): Observable<OpenedTicket> {
    return this.http.post<OpenedTicket>(`${this.baseUrl}/tickets`, input);
  }
}
