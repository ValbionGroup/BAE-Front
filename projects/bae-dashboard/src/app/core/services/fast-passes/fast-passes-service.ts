import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

/** Ce que `GET /fast-passes` sert : le modèle brut, sans transformation. */
interface FastPassApiRow {
  readonly id: number;
  readonly label: string;
  readonly description: string | null;
  readonly duration: number;
  readonly price: number;
}

/**
 * Les deux unités sont nommées parce qu'aucune des deux ne va de soi :
 * `duration` se compte en **années** (`expiryOf()` fait `plus({ years })`), et
 * `price` en **euros** — c'est un `float` en base, pas des centimes.
 */
export interface FastPassRow {
  readonly id: number;
  readonly label: string;
  readonly description: string | null;
  readonly durationYears: number;
  readonly priceEuros: number;
}

@Injectable({ providedIn: 'root' })
export class FastPassesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(): Observable<readonly FastPassRow[]> {
    return this.http.get<readonly FastPassApiRow[]>(`${this.baseUrl}/fast-passes`).pipe(
      map((rows) =>
        rows.map((row) => ({
          id: row.id,
          label: row.label,
          description: row.description,
          durationYears: row.duration,
          priceEuros: Number(row.price),
        })),
      ),
    );
  }
}
