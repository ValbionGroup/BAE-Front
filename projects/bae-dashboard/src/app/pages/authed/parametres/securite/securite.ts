import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Store } from '@ngrx/store';
import { LucideDynamicIcon, LucideLogOut, LucideMonitor } from '@lucide/angular';
import { PageHeaderService } from '#core/services/page-header/page-header-service';
import { SessionsStore } from '#core/store/sessions.store';
import { logout } from '#core/store/auth/auth.actions';
import { selectUser } from '#core/store/auth/auth.selector';
import { isApiError, ToastService, Btn, Badge, Card, Field, Input, Skeleton } from '@bae/ui';
import { ParametresSideNav } from '../side-nav/side-nav';
import type { SessionRow } from './sessions.types';

/**
 * No geo-IP lookup exists and none should be added, so the "localisation"
 * half of the column has no data source. It renders this neutral placeholder
 * rather than a fabricated city.
 */
const LOCATION_PLACEHOLDER = 'Localisation indisponible';

/**
 * Les seuils de la jauge sont ceux que le champ annonce déjà en indication :
 * douze caractères, une majuscule, un chiffre. Le quatrième palier est une marge
 * au-delà de la règle, pas une exigence — d'où « excellent » et non « requis ».
 */
const MIN_LENGTH = 12;
const EXCELLENT_LENGTH = 16;
const RULE_ADVICE = 'Au moins 12 caractères, 1 majuscule et 1 chiffre.';

interface PasswordStrength {
  /** Nombre de barres remplies, de 0 à 4. */
  readonly level: number;
  readonly label: string;
  readonly advice: string;
}

@Component({
  selector: 'bfd-parametres-securite',
  imports: [Btn, Badge, Card, Field, Input, Skeleton, ParametresSideNav, LucideDynamicIcon],
  templateUrl: './securite.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ParametresSecurite implements OnInit {
  private readonly store = inject(SessionsStore);
  private readonly authStore = inject(Store);
  private readonly toast = inject(ToastService);

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
  protected readonly locationPlaceholder = LOCATION_PLACEHOLDER;

  private readonly user = this.authStore.selectSignal(selectUser);

  /**
   * Un compte né du SSO n'a pas de mot de passe à changer. Le `=== true` n'est
   * pas de la coquetterie : `user` est `undefined` tant que le profil n'a pas
   * répondu, et le panneau doit rester caché jusque-là plutôt qu'apparaître
   * pour disparaître.
   */
  protected readonly hasPassword = computed(() => this.user()?.hasPassword === true);

  protected readonly summary = computed(() =>
    this.hasPassword() ? 'Mot de passe et sessions actives.' : 'Sessions actives.',
  );

  protected readonly newPassword = signal('');
  protected readonly barSlots = [1, 2, 3, 4];

  protected readonly strength = computed<PasswordStrength>(() => {
    const value = this.newPassword();
    // Champ vide : aucun verdict. Un « Bon mot de passe » avant la première
    // frappe apprend à ne pas lire la jauge.
    if (value === '') return { level: 0, label: '', advice: '' };

    const met = [value.length >= MIN_LENGTH, /[A-Z]/.test(value), /\d/.test(value)].filter(
      Boolean,
    ).length;

    if (met < 3) {
      return {
        level: met,
        label: met < 2 ? 'Mot de passe faible' : 'Mot de passe moyen',
        advice: RULE_ADVICE,
      };
    }

    const missing = EXCELLENT_LENGTH - value.length;
    if (missing > 0) {
      return {
        level: 3,
        label: 'Bon mot de passe',
        advice: `Ajouter ${missing} caractère${missing > 1 ? 's' : ''} pour « excellent »`,
      };
    }

    return { level: 4, label: 'Excellent mot de passe', advice: '' };
  });

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
