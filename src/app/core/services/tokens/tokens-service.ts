import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { AuthTokens } from '#core/models/auth/auth-tokens.model';

@Injectable({
  providedIn: 'root',
})
export class TokensService {
  private readonly ACCESS_TOKEN_KEY = 'access_token';
  private readonly TOKEN_EXPIRES_AT_KEY = 'token_expires_at';

  setTokens(tokens: AuthTokens): void {
    localStorage.setItem(this.ACCESS_TOKEN_KEY, tokens.accessToken);
    localStorage.setItem(this.TOKEN_EXPIRES_AT_KEY, tokens.expiresAt.toString());
  }

  getAccessToken(): string | null {
    return localStorage.getItem(this.ACCESS_TOKEN_KEY);
  }

  clear(): void {
    localStorage.removeItem(this.ACCESS_TOKEN_KEY);
    localStorage.removeItem(this.TOKEN_EXPIRES_AT_KEY);
  }

  isTokenAboutToExpire(): boolean {
    const expiresAt = Number(localStorage.getItem(this.TOKEN_EXPIRES_AT_KEY));
    return !expiresAt || Date.now() > expiresAt * 1000 - 60_000;
  }

  getValidAccessToken(): Observable<string | null> {
    if (this.isTokenAboutToExpire()) {
      this.clear();
      return of(null);
    }
    return of(this.getAccessToken());
  }
}
