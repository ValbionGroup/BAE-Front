import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { LucideDynamicIcon, LucideShield, LucideTriangleAlert } from '@lucide/angular';
import { API_BASE_URL, Btn, Card, ExternalNavigation } from '@bae/ui';

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
  imports: [RouterLink, Btn, Card, LucideDynamicIcon],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly externalNavigation = inject(ExternalNavigation);

  private readonly ssoErrorCode = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('sso_error'))),
    { initialValue: null },
  );

  protected readonly icAlert = LucideTriangleAlert;
  protected readonly icShield = LucideShield;

  protected readonly ssoError = computed(() => {
    const code = this.ssoErrorCode();
    if (code === null) return null;
    return SSO_ERRORS[code] ?? 'La connexion avec EirbConnect a échoué. Réessayez.';
  });

  /**
   * `app=public` désigne la zone, pas une URL : la destination de retour est
   * résolue côté serveur, qui refuse toute autre valeur. Accepter une URL ici
   * ouvrirait une redirection arbitraire.
   */
  protected loginWithEirbConnect(): void {
    this.externalNavigation.go(`${this.apiBaseUrl}/auth/keycloak/redirect?app=public`);
  }
}
