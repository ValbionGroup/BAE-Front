import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type {
  ApiGood,
  ApiSupplier,
  ApiVoucher,
  CreateVoucherPayload,
} from '#pages/authed/logistique/logistique.types';

export type { ApiGood, ApiSupplier, ApiVoucher, CreateVoucherPayload };

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

  /** Enseignes, par nom — alimente le sélecteur de la modale de création. */
  getSuppliers(): Observable<ApiSupplier[]> {
    return this.http.get<ApiSupplier[]>(`${this.baseUrl}/suppliers`);
  }

  createVoucher(payload: CreateVoucherPayload): Observable<ApiVoucher> {
    return this.http.post<ApiVoucher>(`${this.baseUrl}/vouchers`, payload);
  }

  /**
   * Consomme un bon (`usedAt` = maintenant) ou annule sa consommation
   * (`usedAt: null`).
   *
   * `PATCH` et non `PUT` : le contrôleur n'écrit que les colonnes dont la clé
   * est présente, donc valeur, date et enseigne restent intactes. Et la clé
   * `usedAt` doit être *présente et nulle* pour annuler — une clé absente
   * signifierait « ne touche pas à cette colonne ».
   */
  setVoucherUsed(id: number, usedAt: string | null): Observable<ApiVoucher> {
    return this.http.patch<ApiVoucher>(`${this.baseUrl}/vouchers/${id}`, { usedAt });
  }
}
