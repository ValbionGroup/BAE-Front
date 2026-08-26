import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

interface FastPassApiRow {
  readonly id: number;
  readonly label: string;
  readonly description: string | null;
  readonly duration: number;
  readonly price: number;
}

/** `duration` est en **années**, `price` en **centimes** entiers. */
export interface FastPassRow {
  readonly id: number;
  readonly label: string;
  readonly description: string | null;
  readonly durationYears: number;
  readonly priceCents: number;
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
          priceCents: row.price,
        })),
      ),
    );
  }
}
