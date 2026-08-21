import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  LucideAlertTriangle,
  LucideArrowRight,
  LucideDynamicIcon,
  LucideLockKeyhole,
  LucideMail,
} from '@lucide/angular';
import { Btn, Field, Input } from '@bae/ui';
import { AuthService } from '#core/services/auth/auth-service';
import { AppRoutes } from '#app/app-routes.const';
import { AuthCard } from '../auth-card/auth-card';

/**
 * ⚠️ Cette durée est **annoncée à l'utilisateur** et doit correspondre au TTL
 * effectif du jeton, qui vit dans
 * `BAE-Back/app/services/password_reset_service.ts` (`RESET_TOKEN_TTL_MINUTES`).
 * Rien ne relie les deux dépôts à la compilation : changer l'un oblige à changer
 * l'autre, et aucun outil ne le rappellera.
 */
const RESET_LINK_TTL_LABEL = '30 minutes';

@Component({
  selector: 'bfd-mot-de-passe-oublie',
  imports: [AuthCard, Btn, Field, Input, ReactiveFormsModule, RouterLink, LucideDynamicIcon],
  templateUrl: './mot-de-passe-oublie.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MotDePasseOublie {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  protected readonly icLock = LucideLockKeyhole;
  protected readonly icMail = LucideMail;
  protected readonly icArrowRight = LucideArrowRight;
  protected readonly icAlert = LucideAlertTriangle;

  protected readonly loginPath = `/${AppRoutes.login}`;
  protected readonly description =
    `Saisissez l'email associé à votre compte. Nous vous enverrons un lien de ` +
    `réinitialisation valable ${RESET_LINK_TTL_LABEL}.`;

  protected readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  protected readonly busy = signal(false);
  protected readonly sent = signal(false);
  /** Une panne de transport, jamais un verdict sur l'existence du compte. */
  protected readonly failed = signal(false);

  protected onSubmit(): void {
    if (this.form.invalid || this.busy()) return;

    this.busy.set(true);
    this.failed.set(false);

    this.authService.requestPasswordReset$(this.form.value.email!).subscribe({
      next: () => {
        this.busy.set(false);
        this.sent.set(true);
      },
      /**
       * ⚠️ Seul un échec de transport peut arriver ici : le back répond 204 pour
       * une adresse inconnue comme pour un compte SSO. Ne jamais transformer une
       * erreur en « compte introuvable » — ce serait rétablir côté front l'oracle
       * d'énumération que le back se donne la peine de ne pas offrir.
       */
      error: () => {
        this.busy.set(false);
        this.failed.set(true);
      },
    });
  }
}
