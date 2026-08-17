import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

export type TicketStatus = 'open' | 'in_progress' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high';

export interface TicketRow {
  readonly id: number;
  readonly subject: string;
  readonly status: TicketStatus;
  readonly priority: TicketPriority;
  readonly authorId: number;
  readonly authorName: string | null;
  readonly createdAt: string | null;
  readonly updatedAt: string | null;
}

export interface TicketMessage {
  readonly id: number;
  readonly body: string;
  readonly authorId: number | null;
  readonly authorName: string | null;
  readonly createdAt: string | null;
}

export interface TicketDetail extends TicketRow {
  readonly messages: readonly TicketMessage[];
}

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * ⚠️ Le périmètre est décidé **par le serveur**, d'après la permission
   * `ticket:read` : tous les tickets pour le support, les siens sinon. Aucun
   * paramètre ne l'élargit — en offrir un ouvrirait la boîte de tout le monde.
   */
  list(): Observable<TicketRow[]> {
    return this.http.get<TicketRow[]>(`${this.baseUrl}/tickets`);
  }

  get(id: number): Observable<TicketDetail> {
    return this.http.get<TicketDetail>(`${this.baseUrl}/tickets/${id}`);
  }

  open(input: { subject: string; body: string; priority?: TicketPriority }): Observable<TicketRow> {
    return this.http.post<TicketRow>(`${this.baseUrl}/tickets`, input);
  }

  reply(id: number, body: string): Observable<TicketMessage> {
    return this.http.post<TicketMessage>(`${this.baseUrl}/tickets/${id}/messages`, { body });
  }

  /** Exige `ticket:write` : c'est le geste du support, pas celui de l'auteur. */
  setStatus(id: number, status: TicketStatus): Observable<TicketRow> {
    return this.http.patch<TicketRow>(`${this.baseUrl}/tickets/${id}/status`, { status });
  }
}
