import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Store } from '@ngrx/store';
import { LucideAlertTriangle, LucideDynamicIcon, LucideShield } from '@lucide/angular';
import { Btn, Field, Input, OtpInput } from '@bae/ui';
import { twoFactorVerifyStart } from '#core/store/auth/auth.actions';
import { selectTwoFactorError } from '#core/store/auth/auth.selector';
import { AppRoutes } from '#app/app-routes.const';
import { AuthCard } from '../auth-card/auth-card';

const CODE_LENGTH = 6;

/**
 * L'étape du code, atteinte quand `POST /auth/login` répond
 * `401 E_TWO_FACTOR_REQUIRED`.
 *
 * C'est une **route** et non un état de la page de connexion : le défi vit dans un
 * cookie `httpOnly`, donc il survit à un rafraîchissement là où l'état d'un
 * composant disparaît. Ressaisir le mot de passe après un F5 minterait un second
 * défi ; ici, `twoFactorChallengeGuard` interroge l'API et tranche correctement.
 */
@Component({
  selector: 'bfd-login-two-factor',
  imports: [
    AuthCard,
    Btn,
    Field,
    Input,
    OtpInput,
    ReactiveFormsModule,
    RouterLink,
    LucideDynamicIcon,
  ],
  templateUrl: './two-factor.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginTwoFactor {
  private readonly fb = inject(FormBuilder);
  private readonly store = inject(Store);

  protected readonly icShield = LucideShield;
  protected readonly icAlert = LucideAlertTriangle;
  protected readonly loginPath = `/${AppRoutes.login}`;

  protected readonly useRecovery = signal(false);
  protected readonly busy = signal(false);

  protected readonly form = this.fb.group({
    code: [''],
    recoveryCode: [''],
  });

  private readonly verifyError = this.store.selectSignal(selectTwoFactorError);

  protected readonly description = computed(() =>
    this.useRecovery()
      ? 'Saisissez l’un des codes de secours obtenus à l’activation. Chaque code ne sert qu’une fois.'
      : 'Saisissez le code à 6 chiffres affiché par votre application d’authentification.',
  );

  protected readonly errorMessage = computed(() => {
    const error = this.verifyError();
    if (error === undefined) return null;

    switch (error.code) {
      case 'E_INVALID_TWO_FACTOR_CODE':
        // Le code est refusé, mais le défi vit toujours : le champ reste utilisable
        // et l'utilisateur retente sans repasser par son mot de passe.
        return 'Ce code est incorrect. Vérifiez l’heure de votre téléphone et réessayez.';
      case 'E_TWO_FACTOR_CHALLENGE_INVALID':
        return 'Cette vérification a expiré. Recommencez la connexion.';
      case 'E_TOO_MANY_REQUESTS':
        return 'Trop de tentatives. Recommencez la connexion dans quelques minutes.';
      default:
        return 'La vérification a échoué. Réessayez dans un instant.';
    }
  });

  protected submittable(): boolean {
    return this.currentValue().length >= (this.useRecovery() ? 1 : CODE_LENGTH);
  }

  protected toggleRecovery(): void {
    this.useRecovery.update((current) => !current);
    this.form.reset({ code: '', recoveryCode: '' });
  }

  protected onSubmit(): void {
    if (!this.submittable() || this.busy()) return;

    this.store.dispatch(
      twoFactorVerifyStart({
        code: this.currentValue(),
        kind: this.useRecovery() ? 'recovery' : 'totp',
      }),
    );
  }

  private currentValue(): string {
    const { code, recoveryCode } = this.form.value;
    return (this.useRecovery() ? recoveryCode : code) ?? '';
  }
}
