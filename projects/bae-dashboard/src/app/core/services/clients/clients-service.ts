import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';
import type {
  ClientDetail,
  ClientRow,
  ClientWritePayload,
  ClientsSummary,
  SubscriptionRow,
} from '#pages/authed/adherents/adherents.types';

export interface SubscriptionWritePayload {
  readonly userId: number;
  readonly fastPassId: number;
  readonly subscribedAt?: string;
  readonly payment?: { readonly amount: number; readonly type: 'cash' | 'lydia' };
}

@Injectable({ providedIn: 'root' })
export class ClientsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(): Observable<ClientRow[]> {
    return this.http.get<ClientRow[]>(`${this.baseUrl}/clients`);
  }

  /**
   * Les compteurs viennent du back et non d'un `computed` sur la liste : c'est
   * lui qui décide de ce que « à jour » veut dire, et deux définitions
   * finiraient par diverger d'un écran à l'autre.
   */
  getSummary(): Observable<ClientsSummary> {
    return this.http.get<ClientsSummary>(`${this.baseUrl}/clients/summary`);
  }

  getOne(id: number): Observable<ClientDetail> {
    return this.http.get<ClientDetail>(`${this.baseUrl}/clients/${id}`);
  }

  /**
   * Pas de `create` : un compte client naît d'une connexion EirbConnect sur
   * l'interface publique, et d'elle seule. Le geste du bureau, c'est
   * `subscribe()` — enregistrer une cotisation, qui est autre chose.
   *
   * `PATCH` : le corps est un delta, un champ absent n'est pas effacé.
   */
  update(id: number, payload: ClientWritePayload): Observable<ClientRow> {
    return this.http.patch<ClientRow>(`${this.baseUrl}/clients/${id}`, payload);
  }

  subscribe(payload: SubscriptionWritePayload): Observable<SubscriptionRow> {
    return this.http.post<SubscriptionRow>(`${this.baseUrl}/subscriptions`, payload);
  }
}
