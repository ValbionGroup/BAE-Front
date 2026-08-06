import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

/**
 * Application logs (`logs` table, written by the backend request logger).
 *
 * All fields are camelCase: the apiResponseCaseInterceptor converts snake_case
 * responses automatically.
 */

/**
 * The `user` relation is preloaded by the backend controller, but the `users`
 * table only carries the CAS login and the email — there is no display name on
 * it. `members` (first/last name) is a separate table with no join exposed
 * here, so the activity feed can only label a row with `casId` / `email`.
 */
export interface ApiLogUser {
  id: number;
  casId: string | null;
  email: string;
}

export interface ApiLog {
  id: number;
  /** 'info' | 'warning' | 'error' — set from the HTTP status by the backend. */
  level: string;
  /** e.g. `POST /v1/events → 200 (37ms)`. */
  message: string;
  method: string;
  url: string;
  ip: string;
  userId: number | null;
  createdAt: string | null;
  /** Null for unauthenticated requests (login, signup, public routes). */
  user: ApiLogUser | null;
  // `meta` is deliberately not typed nor consumed: it embeds the full response
  // body of the logged request, which includes access tokens on auth routes.
}

@Injectable({ providedIn: 'root' })
export class LogsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * `GET /logs` returns the whole table — the backend exposes no pagination or
   * limit parameter, so callers must slice client-side.
   */
  getAll(): Observable<ApiLog[]> {
    return this.http.get<ApiLog[]>(`${this.baseUrl}/logs`);
  }
}
