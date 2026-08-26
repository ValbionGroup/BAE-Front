import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';
import type { JobPeriod } from '#core/models/job-period.model';

/**
 * ⚠️ `goodsCount` vient de `GET /categories`, servi `goods_count` et converti en
 * camelCase par l'intercepteur. C'est le nombre de denrées que la catégorie
 * classe — il rend la suppression compréhensible : `goods.category_id` est en
 * `SET NULL`, donc elles seront déclassées, pas détruites.
 */
export interface ApiCategory {
  readonly id: number;
  readonly name: string;
  readonly goodsCount: number;
}

/** `pricedGoodsCount` et `voucherCount` disent d'avance ce qu'une suppression
 *  rencontrerait : le serveur refuse en 409 dès que l'un des deux est non nul. */
export interface ApiSupplier {
  readonly id: number;
  readonly name: string;
  readonly pricedGoodsCount: number;
  readonly voucherCount: number;
}

/**
 * Le référentiel de **vente** — « Plats / Desserts / Boissons ». À ne pas
 * confondre avec `ApiCategory`, qui classe les denrées pour le stockage.
 */
export interface ApiProductCategory {
  readonly id: number;
  readonly name: string;
  readonly productsCount: number;
}

export interface ApiJob {
  readonly id: number;
  readonly name: string;
  readonly type: JobPeriod;
  readonly description: string | null;
}

export interface JobInput {
  readonly name: string;
  readonly type: JobPeriod;
  readonly description: string | null;
}

export interface ReferentielsSnapshot {
  readonly categories: ApiCategory[];
  readonly suppliers: ApiSupplier[];
  readonly jobs: ApiJob[];
  readonly productCategories: ApiProductCategory[];
}

@Injectable({ providedIn: 'root' })
export class ReferentielsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Les trois listes ensemble : l'écran les affiche toutes, et elles ne se
   *  croisent jamais. */
  loadAll(): Observable<ReferentielsSnapshot> {
    return forkJoin({
      categories: this.http.get<ApiCategory[]>(`${this.baseUrl}/categories`),
      suppliers: this.http.get<ApiSupplier[]>(`${this.baseUrl}/suppliers`),
      jobs: this.http.get<ApiJob[]>(`${this.baseUrl}/jobs`),
      productCategories: this.http.get<ApiProductCategory[]>(`${this.baseUrl}/product-categories`),
    });
  }

  createCategory(name: string): Observable<ApiCategory> {
    return this.http.post<ApiCategory>(`${this.baseUrl}/categories`, { name });
  }

  updateCategory(id: number, name: string): Observable<ApiCategory> {
    return this.http.patch<ApiCategory>(`${this.baseUrl}/categories/${id}`, { name });
  }

  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/categories/${id}`);
  }

  createSupplier(name: string): Observable<ApiSupplier> {
    return this.http.post<ApiSupplier>(`${this.baseUrl}/suppliers`, { name });
  }

  updateSupplier(id: number, name: string): Observable<ApiSupplier> {
    return this.http.patch<ApiSupplier>(`${this.baseUrl}/suppliers/${id}`, { name });
  }

  deleteSupplier(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/suppliers/${id}`);
  }

  createProductCategory(name: string): Observable<ApiProductCategory> {
    return this.http.post<ApiProductCategory>(`${this.baseUrl}/product-categories`, { name });
  }

  updateProductCategory(id: number, name: string): Observable<ApiProductCategory> {
    return this.http.patch<ApiProductCategory>(`${this.baseUrl}/product-categories/${id}`, {
      name,
    });
  }

  deleteProductCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/product-categories/${id}`);
  }

  createJob(input: JobInput): Observable<ApiJob> {
    return this.http.post<ApiJob>(`${this.baseUrl}/jobs`, input);
  }

  /** ⚠️ `PUT` et non `PATCH` : c'est ce que `start/routes/coordination.ts` déclare. */
  updateJob(id: number, input: JobInput): Observable<ApiJob> {
    return this.http.put<ApiJob>(`${this.baseUrl}/jobs/${id}`, input);
  }

  deleteJob(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/jobs/${id}`);
  }
}
