import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

/**
 * Encaissements (`transactions` table).
 *
 * All fields are camelCase: the apiResponseCaseInterceptor converts snake_case
 * responses automatically.
 */
export type TransactionType = 'cash' | 'lydia';

export interface ApiTransaction {
  id: number;
  /** Payment method. NOT a caisse/précommande channel — the API has no such split. */
  type: TransactionType;
  /** `decimal(10,2)` already coerced to a number server-side — do not re-parse. */
  /** En **centimes**, comme tout montant de l'API. */
  amount: number;
  /** Flattened from the first attached order; null when no order carries an event. */
  eventId: number | null;
  orderIds: number[];
  createdAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class TransactionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * `GET /transactions`, most recent first. Read-only — the backend exposes no
   * write route for transactions yet.
   *
   * Params are NOT converted by the interceptor — `event_id` is spelled out.
   */
  getAll(eventId?: number): Observable<ApiTransaction[]> {
    return this.http.get<ApiTransaction[]>(`${this.baseUrl}/transactions`, {
      params: eventId === undefined ? {} : { event_id: eventId },
    });
  }
}
