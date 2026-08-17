import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { MenuItem } from '#core/models/event.model';
import type {
  ApiGood,
  ApiShoppingList,
  ApiSupplier,
  ApiVoucher,
  CreateVoucherPayload,
  UpdateVoucherPayload,
} from '#pages/authed/logistique/logistique.types';

export type {
  ApiGood,
  ApiShoppingList,
  ApiSupplier,
  ApiVoucher,
  CreateVoucherPayload,
  UpdateVoucherPayload,
};

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

  /**
   * Édition complète (enseigne, valeur, expiration, condition) — distincte de
   * `setVoucherUsed`, qui ne touche jamais que `usedAt`. `PATCH` pour la même
   * raison : une clé absente ne doit pas écraser une colonne non éditée.
   */
  updateVoucher(id: number, payload: UpdateVoucherPayload): Observable<ApiVoucher> {
    return this.http.patch<ApiVoucher>(`${this.baseUrl}/vouchers/${id}`, payload);
  }

  deleteVoucher(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/vouchers/${id}`);
  }

  /** Le menu d'une soirée, recettes par ordre alphabétique. */
  getEventMenu(eventId: string): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.baseUrl}/events/${eventId}/products`);
  }

  /**
   * Ajoute une recette au menu. `price` est omis volontairement : le back
   * reporte le dernier prix de vente connu de cet article, ce qu'aucun écran ne
   * saurait faire aussi bien.
   */
  addMenuLine(eventId: string, productId: number, quantity: number): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.baseUrl}/events/${eventId}/products`, {
      productId,
      quantity,
    });
  }

  /**
   * Change la quantité de production d'une ligne.
   *
   * `PATCH` : une clé absente signifie « ne touche pas à cette colonne », donc
   * le prix de vente reste intact.
   */
  setMenuLineQuantity(eventId: string, productId: number, quantity: number): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${this.baseUrl}/events/${eventId}/products/${productId}`, {
      quantity,
    });
  }

  removeMenuLine(eventId: string, productId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}/products/${productId}`);
  }

  /** La liste de courses générée pour cette soirée. */
  getShoppingList(eventId: string): Observable<ApiShoppingList> {
    return this.http.get<ApiShoppingList>(`${this.baseUrl}/events/${eventId}/shopping-list`);
  }
}
