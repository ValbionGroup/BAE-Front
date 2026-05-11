import {inject, Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {API_BASE_URL} from '#core/tokens/api-url.token';
import {Observable} from 'rxjs';
import {AuthTokens} from '#core/models/auth/auth-tokens.model';
import {UserProfileModel} from '#core/models/user.model';
import {ApiEndPointV1} from '#core/models/endpoint.model';

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
  login$(email: string, password: string): Observable<AuthTokens> {
    const url = this.buildUrl(ApiEndPointV1.LOGIN);
    return this.http.post<AuthTokens>(url, { email, password });
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
