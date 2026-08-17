import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  LucideArrowRight,
  LucideDynamicIcon,
  LucideShield,
  LucideTriangleAlert,
} from '@lucide/angular';
import { API_BASE_URL, Badge, Btn, Card, Logo } from '@bae/ui';

import { APP_VERSION } from '../../app-version';

/**
 * Messages d'échec du retour SSO. `not_a_member` en est **absent à dessein** :
 * ce refus n'existe que du côté dashboard. Côté public, un compte EirbConnect
 * sans ligne `clients` en obtient une à la volée, donc l'utilisateur n'est
 * jamais éconduit pour ce motif.
 */
const SSO_ERRORS: Readonly<Record<string, string>> = {
  session_expired: 'La connexion a expiré. Réessayez.',
  exchange_failed: 'La connexion avec EirbConnect a échoué. Réessayez.',
  access_denied: 'Vous avez refusé l’autorisation.',
  idp_unavailable: 'EirbConnect est momentanément indisponible. Réessayez dans quelques minutes.',
};

@Component({
  selector: 'bfp-login',
  imports: [Logo, Btn, Badge, Card, LucideDynamicIcon],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly apiBaseUrl = inject(API_BASE_URL);

  private readonly ssoErrorCode = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('sso_error'))),
    { initialValue: null },
  );

  protected readonly appVersion = APP_VERSION;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icShield = LucideShield;
  protected readonly year = computed(() => new Date().getFullYear());

  protected readonly ssoError = computed(() => {
    const code = this.ssoErrorCode();
    if (code === null) return null;
    return SSO_ERRORS[code] ?? 'La connexion avec EirbConnect a échoué. Réessayez.';
  });

  /**
   * Navigation **de premier niveau**, et non un appel `HttpClient` : c'est un
   * flux OAuth, le navigateur doit réellement quitter la page pour atteindre
   * l'IdP puis revenir. Une requête XHR se ferait bloquer et ne poserait aucun
   * cookie de session.
   *
   * `app=public` désigne la zone, pas une URL : la destination de retour est
   * résolue côté serveur, qui refuse toute autre valeur. Accepter une URL ici
   * ouvrirait une redirection arbitraire.
   */
  protected loginWithEirbConnect(): void {
    window.location.href = `${this.apiBaseUrl}/auth/keycloak/redirect?app=public`;
  }
}
