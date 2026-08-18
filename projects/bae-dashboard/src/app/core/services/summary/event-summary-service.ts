import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

export interface SummaryLine {
  readonly productId: number;
  readonly productName: string;
  readonly plannedQty: number;
  readonly producedQty: number;
  readonly soldQty: number;
  /** ⚠️ En **centimes**, comme `event_products.price`. */
  readonly unitPriceCents: number;
  /** Valeur au prix public. */
  readonly revenueCents: number;
  readonly cashedCents: number;
  readonly sponsoredCents: number;
  /** Produit et non vendu — ce qui reste sur les bras. */
  readonly unsoldQty: number;
}

export interface CashedByMethod {
  readonly method: string;
  /** ⚠️ En **euros** : c'est l'unité de `transactions.amount`. */
  readonly amount: number;
  readonly count: number;
}

/**
 * ⚠️ `revenueCents` et `cashedByMethod` ne sont **pas censés être égaux** : le
 * premier est ce que les commandes valaient, le second ce qui a réellement été
 * encaissé. Un écart est une information (remise, précommande payée un autre
 * jour, annulation après paiement), pas une erreur à masquer.
 */
export interface ReceivableByCategory {
  readonly label: string;
  readonly dueCents: number;
}

export interface EventSummary {
  readonly eventId: number;
  readonly orderCount: number;
  readonly cancelledCount: number;
  /** Valeur au prix public : `cashedCents + sponsoredCents`. */
  readonly revenueCents: number;
  readonly cashedCents: number;
  /** À recouvrer auprès du payeur — pas du chiffre d'affaires perdu. */
  readonly sponsoredCents: number;
  readonly payerName: string | null;
  readonly receivableByCategory: readonly ReceivableByCategory[];
  readonly cashedByMethod: readonly CashedByMethod[];
  readonly lines: readonly SummaryLine[];
}

@Injectable({ providedIn: 'root' })
export class EventSummaryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  get(eventId: string): Observable<EventSummary> {
    return this.http.get<EventSummary>(`${this.baseUrl}/events/${eventId}/summary`);
  }
}
