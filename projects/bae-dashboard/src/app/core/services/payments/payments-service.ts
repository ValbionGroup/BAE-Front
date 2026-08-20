import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

/**
 * Demandes de paiement en ligne (table `payments`), distinctes des
 * `transactions` : une transaction naît de l'encaissement, un paiement existe
 * dès la demande et peut n'aboutir jamais. C'est justement cet écart que la page
 * rapproche.
 */
export type PaymentStatus = 'pending' | 'paid' | 'refused' | 'cancelled' | 'expired';

export interface ApiPayment {
  id: number;
  orderRef: string;
  status: PaymentStatus;
  kind: 'pre_order' | 'subscription';
  provider: string;
  amountCents: number;
  providerReference: string | null;
  transactionIdentifier: string | null;
  transactionId: number | null;
  paidAt: string | null;
  expiresAt: string | null;
  createdAt: string | null;
  payerName: string | null;
  payerEmail: string | null;
}

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** `GET /payments`, les plus récents d'abord. Lecture seule. */
  getAll(): Observable<ApiPayment[]> {
    return this.http.get<ApiPayment[]>(`${this.baseUrl}/payments`);
  }
}
