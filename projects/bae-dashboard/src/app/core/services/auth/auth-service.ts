import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@bae/ui';
import { Observable } from 'rxjs';
import { UserProfileModel } from '#core/models/user.model';
import { ApiEndPointV1 } from '#core/models/endpoint.model';
import { TwoFactorChallengeModel, TwoFactorVerifyModel } from '#core/models/two-factor.model';

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

  /** @returns User profile */
  public getUserProfile$(): Observable<UserProfileModel> {
    const url = this.buildUrl(ApiEndPointV1.PROFILE);
    return this.http.get<UserProfileModel>(url);
  }

  /**
   * Un défi 2FA est-il en cours ?
   *
   * Cet aller-retour existe parce que le défi vit dans un cookie `httpOnly` : le
   * SPA ne peut pas le lire, donc il ne peut pas savoir seul s'il a le droit
   * d'afficher l'écran de saisie du code. Sans cette question, un rafraîchissement
   * en cours de défi laisserait une page qui ne sait que produire des 401.
   */
  twoFactorChallenge$(): Observable<TwoFactorChallengeModel> {
    const url = this.buildUrl(ApiEndPointV1.TWO_FACTOR_CHALLENGE);
    return this.http.get<TwoFactorChallengeModel>(url);
  }

  /**
   * Présenter un code TOTP **ou** un code de secours. Exactement l'un des deux :
   * c'est le back qui l'exige, et `kind` évite au front de deviner lequel en
   * inspectant la forme de la saisie.
   */
  verifyTwoFactor$(code: string, kind: 'totp' | 'recovery'): Observable<TwoFactorVerifyModel> {
    const url = this.buildUrl(ApiEndPointV1.TWO_FACTOR_VERIFY);
    const body = kind === 'totp' ? { code } : { recoveryCode: code };
    return this.http.post<TwoFactorVerifyModel>(url, body);
  }

  /**
   * Demander un lien de réinitialisation.
   *
   * ⚠️ Répond `204` quoi qu'il arrive — compte inconnu, compte SSO, non-membre.
   * C'est la garantie anti-énumération du flux : l'appelant ne doit donc **jamais**
   * chercher à en déduire si l'adresse existe, ni afficher un message qui le
   * suggère.
   */
  requestPasswordReset$(email: string): Observable<void> {
    const url = this.buildUrl(ApiEndPointV1.PASSWORD_FORGOT);
    return this.http.post<void>(url, { email });
  }

  resetPassword$(token: string, password: string, passwordConfirmation: string): Observable<void> {
    const url = this.buildUrl(ApiEndPointV1.PASSWORD_RESET);
    return this.http.post<void>(url, { token, password, passwordConfirmation });
  }

  private buildUrl(endpoint: ApiEndPointV1): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
