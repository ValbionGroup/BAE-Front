import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@bae/ui';
import { Observable } from 'rxjs';
import { ApiEndPointV1 } from '#core/models/endpoint.model';
import { RecoveryCodesModel, TwoFactorEnrolmentModel } from '#core/models/two-factor.model';

/**
 * Les cinq gestes de la page « Paramètres → Sécurité ». Tous authentifiés, tous
 * réservés aux membres du bureau côté API.
 *
 * Séparé d'`AuthService` volontairement : c'est d'`AuthService` que dépendent les
 * gardes de routes et l'effet de connexion. Aucun garde n'a de raison de pouvoir
 * atteindre « désactiver la 2FA », et les mélanger rendrait cette dépendance
 * possible par simple autocomplétion.
 */
@Injectable({ providedIn: 'root' })
export class AccountSecurityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  changePassword$(
    currentPassword: string,
    password: string,
    passwordConfirmation: string,
  ): Observable<void> {
    return this.http.put<void>(this.buildUrl(ApiEndPointV1.ACCOUNT_PASSWORD), {
      currentPassword,
      password,
      passwordConfirmation,
    });
  }

  /** Génère un secret en attente. Il ne garde rien avant `confirmEnrolment$`. */
  startEnrolment$(): Observable<TwoFactorEnrolmentModel> {
    return this.http.post<TwoFactorEnrolmentModel>(
      this.buildUrl(ApiEndPointV1.ACCOUNT_TWO_FACTOR),
      {},
    );
  }

  /** Active la 2FA en prouvant le secret, et rend les dix codes de secours. */
  confirmEnrolment$(code: string): Observable<RecoveryCodesModel> {
    return this.http.post<RecoveryCodesModel>(
      this.buildUrl(ApiEndPointV1.ACCOUNT_TWO_FACTOR_CONFIRM),
      { code },
    );
  }

  /**
   * Sans mot de passe, délibérément : régénérer ne dégrade rien, puisque les
   * anciens codes meurent. La friction est gardée là où elle protège quelque
   * chose — c'est-à-dire sur la désactivation.
   */
  regenerateRecoveryCodes$(): Observable<RecoveryCodesModel> {
    return this.http.post<RecoveryCodesModel>(
      this.buildUrl(ApiEndPointV1.ACCOUNT_TWO_FACTOR_RECOVERY_CODES),
      {},
    );
  }

  /**
   * Le mot de passe est exigé : désactiver le second facteur est précisément ce
   * que cherche quelqu'un qui a volé une session.
   */
  disableTwoFactor$(password: string): Observable<void> {
    return this.http.post<void>(this.buildUrl(ApiEndPointV1.ACCOUNT_TWO_FACTOR_DISABLE), {
      password,
    });
  }

  private buildUrl(endpoint: ApiEndPointV1): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
