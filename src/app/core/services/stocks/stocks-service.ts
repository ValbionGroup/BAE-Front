import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

// All fields are camelCase: the apiResponseCaseInterceptor converts snake_case responses automatically.

export interface ApiStockItem {
  id: number;
  name: string;
  unit: string;
  brand: string | null;
  categoryId: number;
  categoryName: string;
  supplierId: number | null;
  totalRemainingQty: number;
  batchCount: number;
  nearestExpirationDate: string | null;
  expiredBatchCount: number;
  soonBatchCount: number;
}

export interface ApiStockBatch {
  id: number;
  goodsId: number;
  restockId: number | null;
  initialQty: number;
  remainingQty: number;
  expirationDate: string | null;
  openedAt: string | null;
}

/** `GET /categories` — alimente le sélecteur de la modale de création. */
export interface ApiCategory {
  readonly id: number;
  readonly name: string;
}

/**
 * Ce que rend `POST /goods` : la ligne `goods` telle quelle.
 *
 * Ce n'est **pas** un `ApiStockItem` : le contrôleur ne précharge ni la
 * catégorie ni les lots, et il n'y a de toute façon aucun agrégat à calculer
 * sur un produit qui vient de naître. Le store complète le reste à zéro.
 */
export interface ApiCreatedGood {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  readonly categoryId: number;
}

/** Corps de `POST /goods`. */
export interface CreateGoodPayload {
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  readonly categoryId: number;
}

@Injectable({ providedIn: 'root' })
export class StocksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(): Observable<ApiStockItem[]> {
    return this.http.get<ApiStockItem[]>(`${this.baseUrl}/stocks`);
  }

  getCategories(): Observable<ApiCategory[]> {
    return this.http.get<ApiCategory[]>(`${this.baseUrl}/categories`);
  }

  createGood(payload: CreateGoodPayload): Observable<ApiCreatedGood> {
    return this.http.post<ApiCreatedGood>(`${this.baseUrl}/goods`, payload);
  }

  getBatches(goodsId: number, showEmpty = false): Observable<ApiStockBatch[]> {
    const params = showEmpty ? { showEmpty: 'true' } : undefined;
    return this.http.get<ApiStockBatch[]>(`${this.baseUrl}/stocks/${goodsId}/batches`, { params });
  }

  discardBatch(goodsId: number, batchId: number, remainingQty: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/stocks/${goodsId}/batches/${batchId}/discard`, {
      remainingQty,
    });
  }
}
