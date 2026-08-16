import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import {
  LucideArrowRight,
  LucideDynamicIcon,
  LucideShield,
  LucideTriangleAlert,
} from '@lucide/angular';
import { ActivatedRoute } from '@angular/router';
import * as AuthActions from '#core/store/auth/auth.actions';
import { selectLoginError } from '#core/store/auth/auth.selector';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { TextInput } from '#shared/components/text-input/text-input';
import { Logo } from '#shared/components/ui/logo/logo';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Field } from '#shared/components/ui/field/field';
import { Toggle } from '#shared/components/ui/toggle/toggle';

@Component({
  selector: 'bfd-login',
  imports: [ReactiveFormsModule, TextInput, Logo, Btn, Badge, Field, LucideDynamicIcon],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly ssoErrorCode = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('sso_error'))),
    { initialValue: null },
  );

  protected readonly loginError = toSignal(this.store.select(selectLoginError));

  /**
   * Le back ne renvoie jamais le détail d'un échec SSO dans l'URL — seulement un
   * code, dont le libellé se décide ici. `not_a_member` est le cas nominal le
   * plus fréquent : un compte EirbConnect valide, mais qui n'est pas du bureau.
   */
  protected readonly ssoError = computed(() => {
    const code = this.ssoErrorCode();
    if (code === null) return null;

    return (
      {
        not_a_member:
          'Ce compte EirbConnect n’est pas rattaché à un membre du BAE. Contactez le bureau.',
        session_expired: 'La connexion a expiré. Réessayez.',
        exchange_failed: 'La connexion avec EirbConnect a échoué. Réessayez.',
        access_denied: 'Vous avez refusé l’autorisation.',
      }[code] ?? 'La connexion avec EirbConnect a échoué. Réessayez.'
    );
  });
  protected readonly year = computed(() => new Date().getFullYear());
  protected readonly rememberMe = signal<boolean>(false);

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly icShield = LucideShield;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icAlert = LucideTriangleAlert;

  protected readonly brandTags = [
    'Gestion des présence',
    'Commandes',
    'Caisse en temps réel',
    'Scan de QR',
    'Statistiques',
  ];

  protected onSubmit(): void {
    if (this.form.invalid) return;
    const { email, password } = this.form.value;
    this.store.dispatch(AuthActions.loginStart({ email: email!, password: password! }));
  }

  /**
   * Navigation **de premier niveau**, et non un appel `HttpClient` : c'est un
   * flux OAuth, le navigateur doit réellement quitter la page pour atteindre
   * l'IdP puis revenir. Une requête XHR se ferait bloquer et ne poserait aucun
   * cookie de session.
   *
   * `app=dashboard` désigne la zone, pas une URL : la destination de retour est
   * résolue côté serveur. Le back refuse toute autre valeur — accepter une URL
   * ici ouvrirait une redirection arbitraire.
   */
  protected loginWithEirbConnect(): void {
    window.location.href = `${this.apiBaseUrl}/auth/keycloak/redirect?app=dashboard`;
  }

  protected switchRemember() {
    this.rememberMe.set(!this.rememberMe());
  }
}
