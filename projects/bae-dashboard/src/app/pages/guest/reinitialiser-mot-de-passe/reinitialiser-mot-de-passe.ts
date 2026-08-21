import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { LucideAlertTriangle, LucideDynamicIcon, LucideLockKeyhole } from '@lucide/angular';
import { Btn, Field, Input, isApiError } from '@bae/ui';
import { AuthService } from '#core/services/auth/auth-service';
import { AppRoutes } from '#app/app-routes.const';
import {
  PASSWORD_RULE_HINT,
  STRENGTH_BAR_SLOTS,
  meetsPasswordRule,
  passwordStrengthOf,
} from '#shared/password-strength';
import { AuthCard } from '../auth-card/auth-card';

@Component({
  selector: 'bfd-reinitialiser-mot-de-passe',
  imports: [AuthCard, Btn, Field, Input, ReactiveFormsModule, LucideDynamicIcon],
  templateUrl: './reinitialiser-mot-de-passe.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReinitialiserMotDePasse {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  protected readonly icLock = LucideLockKeyhole;
  protected readonly icAlert = LucideAlertTriangle;
  protected readonly ruleHint = PASSWORD_RULE_HINT;
  protected readonly barSlots = STRENGTH_BAR_SLOTS;

  protected readonly token = signal<string | null>(null);
  protected readonly busy = signal(false);
  protected readonly done = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly expired = signal(false);

  protected readonly form = this.fb.group({
    password: ['', [Validators.required, Validators.minLength(12)]],
    passwordConfirmation: ['', Validators.required],
  });

  private readonly password = toSignal(this.form.controls.password.valueChanges, {
    initialValue: '',
  });
  private readonly confirmation = toSignal(this.form.controls.passwordConfirmation.valueChanges, {
    initialValue: '',
  });

  protected readonly strength = computed(() => passwordStrengthOf(this.password() ?? ''));

  protected readonly mismatch = computed(() => {
    const confirmation = this.confirmation() ?? '';
    return confirmation !== '' && confirmation !== (this.password() ?? '');
  });

  protected readonly submittable = computed(
    () =>
      meetsPasswordRule(this.password() ?? '') && !this.mismatch() && this.confirmation() !== '',
  );

  protected readonly description = computed(() =>
    this.done() ? null : 'Choisissez un mot de passe que vous n’utilisez nulle part ailleurs.',
  );

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    this.token.set(token);

    /**
     * ⚠️ Le jeton est retiré de l'URL dès la première peinture. Laissé là, il
     * entre dans l'historique du navigateur et dans l'en-tête `Referer` de toute
     * requête sortante de cette page — donc un secret à usage unique se retrouve
     * dans des journaux tiers. `replaceUrl` évite en plus d'ajouter une entrée
     * d'historique que le bouton retour ramènerait.
     */
    if (token !== null) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {},
        replaceUrl: true,
      });
    }
  }

  protected onSubmit(): void {
    const token = this.token();
    // Sans jeton, aucune requête : poster `token: null` ne produirait qu'un 422.
    if (token === null || !this.submittable() || this.busy()) return;

    this.busy.set(true);
    this.error.set(null);
    this.expired.set(false);

    const { password, passwordConfirmation } = this.form.value;

    this.authService.resetPassword$(token, password!, passwordConfirmation!).subscribe({
      next: () => {
        this.busy.set(false);
        this.done.set(true);
      },
      error: (failure: unknown) => {
        this.busy.set(false);
        const body = failure instanceof HttpErrorResponse ? failure.error : null;

        if (isApiError(body) && body.code === 'E_INVALID_RESET_TOKEN') {
          this.expired.set(true);
          this.error.set('Ce lien est invalide ou a expiré.');
          return;
        }

        this.error.set('Le changement a échoué. Réessayez dans un instant.');
      },
    });
  }

  protected goToLogin(): void {
    void this.router.navigate([AppRoutes.login]);
  }

  protected goToForgot(): void {
    void this.router.navigate([AppRoutes.motDePasseOublie]);
  }
}
