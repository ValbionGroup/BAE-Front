import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

export type PaymentStatus = 'pending' | 'paid' | 'refused' | 'cancelled' | 'expired';

export interface PaymentView {
  readonly orderRef: string;
  readonly status: PaymentStatus;
  readonly amountCents: number;
  /** L'URL de la page de paiement Lydia. `null` dès que la demande est close. */
  readonly mobileUrl: string | null;
  readonly expiresAt: string | null;
}

export interface PreOrderLineInput {
  readonly productId: number;
  readonly quantity: number;
}

/**
 * Rythme d'interrogation de la page de retour, en millisecondes cumulées depuis
 * le chargement.
 *
 * **Le premier appel est immédiat, et c'est celui qui compte.** Lydia notifie le
 * serveur en parallèle de la redirection du navigateur, mais l'appel direct de
 * machine à machine arrive presque toujours avant le rendu de la page : la
 * lecture initiale répond donc « payé » sans aucune attente. Les suivants ne
 * couvrent que la traîne, et 30 s bornent l'attente avant d'orienter ailleurs.
 */
export const POLL_DELAYS_MS: readonly number[] = [
  0,
  500,
  1000,
  ...Array.from({ length: 14 }, () => 2000),
];

@Injectable({ providedIn: 'root' })
export class PaymentsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Aucun montant n'est envoyé : le serveur recalcule le prix depuis le tarif de
   * la soirée. Le total affiché ici n'a qu'une valeur indicative.
   */
  openPreOrder(
    eventId: number,
    lines: readonly PreOrderLineInput[],
    pickupAt: string | null = null,
  ): Observable<PaymentView> {
    return this.http.post<PaymentView>(`${this.baseUrl}/account/pre-orders`, {
      eventId,
      lines,
      ...(pickupAt === null ? {} : { pickupAt }),
    });
  }

  openSubscription(fastPassId: number): Observable<PaymentView> {
    return this.http.post<PaymentView>(`${this.baseUrl}/account/subscriptions`, { fastPassId });
  }

  status(orderRef: string): Observable<PaymentView> {
    return this.http.get<PaymentView>(`${this.baseUrl}/account/payments/${orderRef}`);
  }
}
