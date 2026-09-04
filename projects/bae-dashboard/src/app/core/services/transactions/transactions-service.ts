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
export type TransactionType = 'cash' | 'lydia' | 'card';

/**
 * Libellés des trois moyens de paiement. Le `Record` est exhaustif à dessein :
 * ajouter une valeur à `TransactionType` sans l'étiqueter ne compile pas.
 */
/**
 * Ce qui a produit l'encaissement. Les trois valeurs nommées correspondent aux
 * trois seuls chemins qui créent une transaction : la caisse, une précommande
 * réglée en ligne, une cotisation. `other` couvre une transaction orpheline.
 */
export type TransactionNature = 'order' | 'pre_order' | 'subscription' | 'other';

export const PAYMENT_METHOD_LABEL: Record<TransactionType, string> = {
  cash: 'Espèces',
  lydia: 'Lydia',
  card: 'CB',
};

export interface ApiTransaction {
  id: number;
  /**
   * Moyen de paiement, pas un canal caisse/précommande — l'API n'a pas ce
   * découpage. `card` a été ouvert par `add_card_to_transactions_type`.
   */
  type: TransactionType;
  /** `decimal(10,2)` already coerced to a number server-side — do not re-parse. */
  /** En **centimes**, comme tout montant de l'API. */
  amount: number;
  /** Flattened from the first attached order; null when no order carries an event. */
  eventId: number | null;
  orderIds: number[];
  nature: TransactionNature;
  /** Soirée pour la caisse, résumé produit pour une précommande, fast pass pour une cotisation. */
  label: string | null;
  /** Somme des quantités achetées, tous articles confondus. `0` pour une cotisation. */
  itemCount: number;
  payer: string | null;
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
