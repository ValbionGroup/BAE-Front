import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@bae/ui';
import { Observable } from 'rxjs';
import { UserProfileModel } from '#core/models/user.model';
import { ApiEndPointV1 } from '#core/models/endpoint.model';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /**
   * Authenticate a user from their email address and password.
   *
   * @param email Email address
   * @param password Password
   * @returns Auth tokens
   */
  login$(email: string, password: string): Observable<string> {
    const url = this.buildUrl(ApiEndPointV1.LOGIN);
    return this.http.post<string>(url, { email, password });
  }

  /**
   * Seul le serveur peut effacer un cookie `httpOnly` : la déconnexion est donc
   * une requête, et non un nettoyage local. Un `localStorage.clear()` laisserait
   * la session ouverte côté serveur.
   */
  logout$(): Observable<void> {
    return this.http.post<void>(this.buildUrl(ApiEndPointV1.LOGOUT), {});
  }

  /** @returns User profile */
  public getUserProfile$(): Observable<UserProfileModel> {
    const url = this.buildUrl(ApiEndPointV1.PROFILE);
    return this.http.get<UserProfileModel>(url);
  }

  private buildUrl(endpoint: ApiEndPointV1): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
