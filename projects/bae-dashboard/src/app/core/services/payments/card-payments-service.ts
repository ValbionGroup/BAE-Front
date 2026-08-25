import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';
import type { CheckoutLine } from '#core/services/orders/orders-service';

/** L'encaissement par carte au comptoir (SumUp Terminal Payments). */
export type CardPaymentStatus = 'pending' | 'paid' | 'refused' | 'cancelled' | 'expired';

export interface ApiCardPayment {
  readonly orderRef: string;
  readonly status: CardPaymentStatus;
  readonly amountCents: number;
  readonly eventId: number;
  readonly expiresAt: string | null;
}

@Injectable({ providedIn: 'root' })
export class CardPaymentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Allume le terminal. Le panier est retarifé côté serveur, comme partout. */
  open(
    eventId: string,
    lines: readonly CheckoutLine[],
    clientId?: number | null,
    sponsorshipCategoryId?: number | null,
  ): Observable<ApiCardPayment> {
    return this.http.post<ApiCardPayment>(`${this.baseUrl}/events/${eventId}/card-payments`, {
      lines,
      ...(clientId ? { clientId } : {}),
      ...(sponsorshipCategoryId ? { sponsorshipCategoryId } : {}),
    });
  }

  get(orderRef: string): Observable<ApiCardPayment> {
    return this.http.get<ApiCardPayment>(`${this.baseUrl}/card-payments/${orderRef}`);
  }

  refresh(orderRef: string): Observable<ApiCardPayment> {
    return this.http.post<ApiCardPayment>(`${this.baseUrl}/card-payments/${orderRef}/refresh`, {});
  }

  cancel(orderRef: string): Observable<ApiCardPayment> {
    return this.http.post<ApiCardPayment>(`${this.baseUrl}/card-payments/${orderRef}/cancel`, {});
  }
}
