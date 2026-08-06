import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiGood, ApiVoucher } from '#pages/authed/logistique/logistique.types';

export type { ApiGood, ApiVoucher };

@Injectable({ providedIn: 'root' })
export class LogistiqueService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Goods with their per-supplier prices, cheapest supplier first. */
  getGoods(): Observable<ApiGood[]> {
    return this.http.get<ApiGood[]>(`${this.baseUrl}/goods`);
  }

  /** Vouchers ("bons d'achat"), soonest expiry first. */
  getVouchers(): Observable<ApiVoucher[]> {
    return this.http.get<ApiVoucher[]>(`${this.baseUrl}/vouchers`);
  }
}
