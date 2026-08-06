import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiSession } from '#pages/authed/parametres/securite/sessions.types';

export type { ApiSession };

@Injectable({ providedIn: 'root' })
export class SessionsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Active access tokens of the authenticated user, newest first. */
  getAll(): Observable<ApiSession[]> {
    return this.http.get<ApiSession[]>(`${this.baseUrl}/account/sessions`);
  }

  /**
   * Revokes one session. Answers `204` with no body.
   *
   * Fails with `403 E_CANNOT_REVOKE_CURRENT_SESSION` on the current session —
   * ending that one is a logout and must go through the auth flow — and with
   * `404 E_SESSION_NOT_FOUND` for an unknown or someone else's session.
   */
  revoke(id: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/account/sessions/${id}`);
  }
}
