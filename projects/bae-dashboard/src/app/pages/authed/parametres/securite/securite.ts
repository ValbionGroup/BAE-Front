import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { lastValueFrom } from 'rxjs';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Store } from '@ngrx/store';
import { LucideDynamicIcon, LucideLogOut, LucideMonitor, LucideShield } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { SessionsStore } from '#core/store/sessions.store';
import { TwoFactorStore } from '#core/store/two-factor.store';
import { logout, rehydrateAuth } from '#core/store/auth/auth.actions';
import { selectUser } from '#core/store/auth/auth.selector';
import { AccountSecurityService } from '#core/services/account-security/account-security-service';
import {
  PASSWORD_RULE_HINT,
  STRENGTH_BAR_SLOTS,
  meetsPasswordRule,
  passwordStrengthOf,
} from '#shared/password-strength';
import {
  isApiError,
  ToastService,
  Btn,
  Badge,
  Card,
  Checkbox,
  Field,
  Input,
  OtpInput,
  QrCode,
  Skeleton,
} from '@bae/ui';
import { ParametresSideNav } from '../side-nav/side-nav';
import type { SessionRow } from './sessions.types';

/**
 * No geo-IP lookup exists and none should be added, so the "localisation"
 * half of the column has no data source. It renders this neutral placeholder
 * rather than a fabricated city.
 */
const LOCATION_PLACEHOLDER = 'Localisation indisponible';

@Component({
  selector: 'bfd-parametres-securite',
  imports: [
    Btn,
    Badge,
    Card,
    Field,
    Input,
    OtpInput,
    QrCode,
    Checkbox,
    Skeleton,
    ReactiveFormsModule,
    ParametresSideNav,
    LucideDynamicIcon,
  ],
  templateUrl: './securite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresSecurite implements OnInit {
  private readonly store = inject(SessionsStore);
  private readonly twoFactor = inject(TwoFactorStore);
  private readonly authStore = inject(Store);
  private readonly toast = inject(ToastService);
  private readonly fb = inject(FormBuilder);
  private readonly accountSecurity = inject(AccountSecurityService);

  constructor() {
    inject(PageHeaderService).set({
      title: 'Paramètres',
      subtitle: 'Compte · sécurité',
      breadcrumb: ['Paramètres', 'Sécurité'],
      activeNavId: 'set',
    });
  }

  ngOnInit(): void {
    void this.store.load();
  }

  protected readonly icLogout = LucideLogOut;
  protected readonly icDevice = LucideMonitor;
  protected readonly icShield = LucideShield;
  protected readonly locationPlaceholder = LOCATION_PLACEHOLDER;

  private readonly user = this.authStore.selectSignal(selectUser);

  /**
   * Un compte né du SSO n'a pas de mot de passe à changer. Le `=== true` n'est
   * pas de la coquetterie : `user` est `undefined` tant que le profil n'a pas
   * répondu, et le panneau doit rester caché jusque-là plutôt qu'apparaître
   * pour disparaître.
   */
  protected readonly hasPassword = computed(() => this.user()?.hasPassword === true);

  /**
   * Un compte SSO ne voit ni mot de passe ni 2FA — la 2FA ne garde que la
   * connexion par mot de passe, et son second facteur est géré par l'IdP.
   */
  protected readonly summary = computed(() => {
    if (!this.hasPassword()) return 'Sessions actives.';
    return this.twoFactorEnabled()
      ? 'Mot de passe, double authentification et sessions actives.'
      : 'Mot de passe et sessions actives.';
  });

  protected readonly barSlots = STRENGTH_BAR_SLOTS;
  protected readonly ruleHint = PASSWORD_RULE_HINT;

  protected readonly passwordForm = this.fb.group({
    currentPassword: ['', Validators.required],
    password: ['', [Validators.required, Validators.minLength(12)]],
    passwordConfirmation: ['', Validators.required],
  });

  /**
   * ⚠️ Le formulaire **entier** passe par un signal, et non chaque contrôle
   * séparément : un `computed` ne suit que les signaux qu'il lit. Mélanger un
   * `this.passwordForm.value.x` non réactif à des signaux donne un calcul qui ne
   * se rafraîchit que par accident, quand un *autre* champ change — donc un
   * bouton qui reste désactivé selon l'ordre de saisie.
   */
  private readonly formValue = toSignal(this.passwordForm.valueChanges, {
    initialValue: this.passwordForm.value,
  });

  private readonly newPasswordValue = computed(() => this.formValue()?.password ?? '');
  private readonly confirmationValue = computed(() => this.formValue()?.passwordConfirmation ?? '');

  protected readonly strength = computed(() => passwordStrengthOf(this.newPasswordValue()));

  protected readonly passwordMismatch = computed(() => {
    const confirmation = this.confirmationValue();
    return confirmation !== '' && confirmation !== this.newPasswordValue();
  });

  protected readonly passwordSubmittable = computed(
    () =>
      (this.formValue()?.currentPassword ?? '') !== '' &&
      meetsPasswordRule(this.newPasswordValue()) &&
      !this.passwordMismatch() &&
      this.confirmationValue() !== '',
  );

  protected readonly passwordBusy = signal(false);

  // --- Double authentification ---

  /**
   * Source unique de vérité : le profil. Le magasin de l'assistant ne porte que
   * les étapes en cours, jamais ce fait.
   */
  protected readonly twoFactorEnabled = computed(() => this.user()?.twoFactorEnabled === true);
  protected readonly recoveryCodesRemaining = computed(
    () => this.user()?.recoveryCodesRemaining ?? 0,
  );

  protected readonly confirmedAtLabel = computed(() => {
    const iso = this.user()?.twoFactorConfirmedAt;
    if (iso === null || iso === undefined) return null;
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return null;
    return format(date, 'd MMMM yyyy', { locale: fr });
  });

  protected readonly step = this.twoFactor.step;
  protected readonly twoFactorBusy = this.twoFactor.busy;
  protected readonly twoFactorError = this.twoFactor.error;
  protected readonly secret = this.twoFactor.secret;
  protected readonly otpauthUri = this.twoFactor.otpauthUri;
  protected readonly recoveryCodes = this.twoFactor.recoveryCodes;

  /** Le secret en groupes de quatre : c'est ainsi qu'on le recopie sans se perdre. */
  protected readonly groupedSecret = computed(() => {
    const secret = this.secret();
    return secret === null ? null : (secret.match(/.{1,4}/g) ?? [secret]).join(' ');
  });

  protected readonly enrolmentCode = signal('');
  protected readonly codesAcknowledged = signal(false);
  protected readonly disablePassword = signal('');
  protected readonly disabling = signal(false);

  protected async startEnrolment(): Promise<void> {
    this.enrolmentCode.set('');
    this.codesAcknowledged.set(false);
    await this.twoFactor.start();
  }

  protected async confirmEnrolment(): Promise<void> {
    if (this.enrolmentCode().length !== 6 || this.twoFactorBusy()) return;

    if (await this.twoFactor.confirm(this.enrolmentCode())) {
      this.enrolmentCode.set('');
      // Le profil porte le drapeau `twoFactorEnabled` : sans réhydratation, la
      // carte continuerait d'afficher « Inactive » alors que la 2FA est en place.
      this.authStore.dispatch(rehydrateAuth());
    }
  }

  protected async regenerateCodes(): Promise<void> {
    this.codesAcknowledged.set(false);
    if (await this.twoFactor.regenerate()) {
      this.authStore.dispatch(rehydrateAuth());
    }
  }

  protected async disableTwoFactor(): Promise<void> {
    if (this.disablePassword() === '' || this.twoFactorBusy()) return;

    if (await this.twoFactor.disable(this.disablePassword())) {
      this.disablePassword.set('');
      this.disabling.set(false);
      this.toast.show({
        type: 'success',
        title: 'Double authentification désactivée',
        message: 'Votre mot de passe est redevenu le seul facteur.',
      });
      this.authStore.dispatch(rehydrateAuth());
    }
  }

  protected dismissCodes(): void {
    this.codesAcknowledged.set(false);
    this.twoFactor.reset();
  }

  protected async copy(value: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(value);
      this.toast.show({ type: 'success', title: 'Copié', message: '' });
    } catch {
      // Le presse-papiers est refusé hors contexte sécurisé, et le texte reste
      // sélectionnable à la main : inutile d'alarmer.
      this.toast.show({
        type: 'error',
        title: 'Copie impossible',
        message: 'Sélectionnez le texte pour le copier.',
      });
    }
  }

  protected async submitPassword(): Promise<void> {
    if (!this.passwordSubmittable() || this.passwordBusy()) return;

    const { currentPassword, password, passwordConfirmation } = this.passwordForm.value;
    this.passwordBusy.set(true);

    try {
      await lastValueFrom(
        this.accountSecurity.changePassword$(currentPassword!, password!, passwordConfirmation!),
      );
      this.cancelPassword();
      this.toast.show({
        type: 'success',
        title: 'Mot de passe mis à jour',
        message: 'Vos autres sessions ont été déconnectées.',
      });
      // Les autres sessions sont tombées côté serveur : la liste à l'écran ne dit
      // plus la vérité.
      await this.store.refresh();
    } catch (error) {
      this.toast.show({
        type: 'error',
        title: 'Changement impossible',
        message: this.errorMessage(error),
      });
    } finally {
      this.passwordBusy.set(false);
    }
  }

  protected cancelPassword(): void {
    this.passwordForm.reset({ currentPassword: '', password: '', passwordConfirmation: '' });
  }

  protected readonly loading = this.store.loading;
  protected readonly loadError = this.store.loadError;
  protected readonly sessions = this.store.sessions;

  /** Ids currently being revoked, so each row can disable its own button. */
  private readonly pendingIds = signal<ReadonlySet<number>>(new Set());

  protected readonly sessionCountLabel = computed(() => {
    const count = this.sessions().length;
    if (count === 0) return 'Aucune session active';
    return count === 1 ? '1 appareil connecté' : `${count} appareils connectés`;
  });

  protected readonly revokableCount = computed(
    () => this.sessions().filter((session) => !session.isCurrent).length,
  );

  protected isPending(id: number): boolean {
    return this.pendingIds().has(id);
  }

  /**
   * Visually-hidden suffix appended to the "Révoquer" label so every button
   * has a distinct accessible name instead of a wall of identical ones.
   */
  protected revokeLabel(session: SessionRow): string {
    return `la session ${session.deviceLabel}`;
  }

  protected async revoke(session: SessionRow): Promise<void> {
    // Belt and braces: the button is disabled on the current row, but the API
    // is the real authority and answers 403 here.
    if (session.isCurrent || this.isPending(session.id)) return;

    this.setPending(session.id, true);
    try {
      await this.store.revoke(session.id);
      this.toast.show({
        type: 'success',
        title: 'Session révoquée',
        message: `${session.deviceLabel} n'a plus accès à votre compte.`,
      });
    } catch (error) {
      this.toast.show({
        type: 'error',
        title: 'Révocation impossible',
        message: this.errorMessage(error),
      });
      // Resync: the row may be gone (404) or the current one (403); either way
      // the list on screen is no longer trustworthy.
      await this.store.refresh();
    } finally {
      this.setPending(session.id, false);
    }
  }

  /**
   * Ends the current session. Reuses the existing auth logout flow — the
   * `[Auth] Logout` action, whose effect shuts the websocket down, clears the
   * tokens and navigates to the login page — instead of calling
   * `DELETE /account/sessions/:id`, which refuses the current session (403)
   * precisely because it would strand the SPA on a dead token.
   */
  protected logoutCurrent(): void {
    this.authStore.dispatch(logout());
  }

  /**
   * Revokes every other session, then logs the current one out through the
   * same auth flow.
   */
  protected async logoutEverywhere(): Promise<void> {
    const others = this.sessions().filter((session) => !session.isCurrent);

    for (const session of others) {
      try {
        await this.store.revoke(session.id);
      } catch (error) {
        this.toast.show({
          type: 'error',
          title: 'Déconnexion partielle',
          message: this.errorMessage(error),
        });
        return;
      }
    }

    this.logoutCurrent();
  }

  protected retry(): void {
    void this.store.refresh();
  }

  private setPending(id: number, pending: boolean): void {
    this.pendingIds.update((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  /** Maps the documented API error codes onto wording a user can act on. */
  private errorMessage(error: unknown): string {
    const body = error instanceof HttpErrorResponse ? error.error : null;
    if (isApiError(body)) {
      switch (body.code) {
        case 'E_CANNOT_REVOKE_CURRENT_SESSION':
          return 'Cette session est celle que vous utilisez : déconnectez-vous pour la fermer.';
        case 'E_SESSION_NOT_FOUND':
          return "Cette session n'existe plus. La liste a été actualisée.";
      }
    }
    return 'Une erreur est survenue. Réessayez dans un instant.';
  }
}
