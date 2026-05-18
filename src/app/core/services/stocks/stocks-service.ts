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

@Injectable({ providedIn: 'root' })
export class StocksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(): Observable<ApiStockItem[]> {
    return this.http.get<ApiStockItem[]>(`${this.baseUrl}/stocks`);
  }

  getBatches(goodsId: number): Observable<ApiStockBatch[]> {
    return this.http.get<ApiStockBatch[]>(`${this.baseUrl}/stocks/${goodsId}/batches`);
  }

  discardBatch(goodsId: number, batchId: number, remainingQty: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/stocks/${goodsId}/batches/${batchId}/discard`, {
      remainingQty,
    });
  }
}
