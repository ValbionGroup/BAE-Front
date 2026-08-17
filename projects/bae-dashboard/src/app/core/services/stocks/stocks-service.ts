import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

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
  /** Le numéro lisible du lot (`L26-4`), celui qu'on lit sur l'étagère. */
  label: string;
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

/** Réponse de `POST /goods` : la ligne `goods` seule, sans catégorie ni agrégats. */
export interface ApiCreatedGood {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  readonly categoryId: number;
}

/** Contrainte `goods_unit_check` : un enum en base, pas du texte libre. */
export const GOOD_UNITS = ['pcs', 'kg', 'liter'] as const;

export type GoodUnit = (typeof GOOD_UNITS)[number];

export const GOOD_UNIT_LABELS: Readonly<Record<GoodUnit, string>> = {
  pcs: 'Pièce',
  kg: 'Kilogramme',
  liter: 'Litre',
};

/** `brand` est une chaîne, jamais `null` : la colonne est `NOT NULL`. */
export interface CreateGoodPayload {
  readonly name: string;
  readonly unit: GoodUnit;
  readonly brand: string;
  readonly categoryId: number;
  /** `null` quand le produit n'a pas été créé depuis un scan. */
  readonly barcode: string | null;
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

  /** Liste vide si le code n'est rattaché à rien : réponse normale, pas une
   *  erreur — c'est elle qui déclenche la création. */
  findByBarcode(barcode: string): Observable<ApiCreatedGood[]> {
    return this.http.get<ApiCreatedGood[]>(`${this.baseUrl}/goods`, { params: { barcode } });
  }

  /** Entre un lot en stock. `expirationDate` est un `YYYY-MM-DD`, ou `null`. */
  createBatch(payload: {
    goodId: number;
    quantity: number;
    expirationDate: string | null;
  }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/stock-batches`, payload);
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
