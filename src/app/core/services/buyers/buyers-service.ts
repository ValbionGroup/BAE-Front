import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

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

  verifyQr(token: string): Observable<Buyer> {
    return this.http.post<Buyer>(`${this.baseUrl}/qr/verify`, { token });
  }

  search(query: string): Observable<Buyer[]> {
    return this.http.get<Buyer[]>(`${this.baseUrl}/buyers`, { params: { q: query } });
  }
}
