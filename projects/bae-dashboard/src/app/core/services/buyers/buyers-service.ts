import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

export interface BuyerFastPass {
  readonly label: string;
  /** ISO 8601. Dérivé côté back de `subscribed_at + duration`. */
  readonly validUntil: string;
}

export interface Buyer {
  readonly userId: number;
  readonly name: string;
  readonly fastPass: BuyerFastPass | null;
}

export interface PreOrderLine {
  readonly productId: number;
  readonly productName: string;
  readonly quantity: number;
  readonly receivedQuantity: number;
}

export interface PreOrderPickup {
  readonly id: number;
  readonly eventId: number;
  readonly eventName: string;
  /** Déjà payée en ligne : le comptoir laisse passer sans encaisser. */
  readonly paid: boolean;
  readonly lines: readonly PreOrderLine[];
  readonly fullyCollected: boolean;
}

/**
 * Le comptoir n'a qu'un scanner : le type est porté par le jeton, et la réponse
 * dit ce qui a été lu — une personne, ou une précommande à remettre.
 */
export type QrScan =
  | { readonly kind: 'buyer'; readonly buyer: Buyer }
  | { readonly kind: 'pre_order'; readonly buyer: Buyer; readonly preOrder: PreOrderPickup };

export interface QrToken {
  readonly token: string;
  readonly expiresAt: string;
  readonly ttlSeconds: number;
}

@Injectable({ providedIn: 'root' })
export class BuyersService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Le QR de la personne connectée. */
  myQr(): Observable<QrToken> {
    return this.http.get<QrToken>(`${this.baseUrl}/account/qr`);
  }

  verifyQr(token: string): Observable<QrScan> {
    return this.http.post<QrScan>(`${this.baseUrl}/qr/verify`, { token });
  }

  search(query: string): Observable<Buyer[]> {
    return this.http.get<Buyer[]>(`${this.baseUrl}/buyers`, { params: { q: query } });
  }
}
