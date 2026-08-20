import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Store } from '@ngrx/store';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
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
import { API_BASE_URL, ExternalNavigation, Logo, Btn, Badge, Field, Toggle } from '@bae/ui';
import { HealthService } from '#core/services/health/health-service';
import { ServiceStatus } from '#core/models/health.model';
import { TextInput } from '#shared/components/text-input/text-input';
import { APP_VERSION } from '#app/app-version';

@Component({
  selector: 'bfd-login',
  imports: [ReactiveFormsModule, TextInput, Logo, Btn, Badge, Field, LucideDynamicIcon],
  templateUrl: './login.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Login {
  protected readonly appVersion = APP_VERSION;

  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);
  private readonly apiBaseUrl = inject(API_BASE_URL);
  private readonly externalNavigation = inject(ExternalNavigation);
  private readonly health = inject(HealthService);
  private readonly ssoErrorCode = toSignal(
    inject(ActivatedRoute).queryParamMap.pipe(map((params) => params.get('sso_error'))),
    { initialValue: null },
  );

  protected readonly loginError = toSignal(this.store.select(selectLoginError));

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
        idp_unavailable:
          'EirbConnect est momentanément indisponible. Réessayez dans quelques minutes, ou connectez-vous par email.',
      }[code] ?? 'La connexion avec EirbConnect a échoué. Réessayez.'
    );
  });
  protected readonly year = computed(() => new Date().getFullYear());
  protected readonly rememberMe = signal<boolean>(false);

  protected readonly serviceStatus = signal<ServiceStatus>('checking');

  protected readonly serviceLabel = computed(
    () =>
      ({
        checking: 'Vérification des services…',
        ok: 'Tous les services sont opérationnels',
        degraded: 'Service dégradé',
        down: 'API injoignable',
      })[this.serviceStatus()],
  );

  protected readonly serviceDotClass = computed(
    () =>
      ({
        checking: 'bg-muted',
        ok: 'bg-ok',
        degraded: 'bg-warn',
        down: 'bg-danger',
      })[this.serviceStatus()],
  );

  protected form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  protected readonly icShield = LucideShield;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icAlert = LucideTriangleAlert;

  constructor() {
    this.health
      .check()
      .pipe(takeUntilDestroyed())
      .subscribe((status) => this.serviceStatus.set(status));
  }

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
   * `app=dashboard` désigne la zone, pas une URL : la destination de retour est
   * résolue côté serveur. Le back refuse toute autre valeur — accepter une URL
   * ici ouvrirait une redirection arbitraire.
   */
  protected loginWithEirbConnect(): void {
    this.externalNavigation.go(`${this.apiBaseUrl}/auth/keycloak/redirect?app=dashboard`);
  }

  protected switchRemember() {
    this.rememberMe.set(!this.rememberMe());
  }
}
