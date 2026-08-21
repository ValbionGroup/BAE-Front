import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { lastValueFrom } from 'rxjs';
import { isApiError } from '@bae/ui';
import { AccountSecurityService } from '#core/services/account-security/account-security-service';

/**
 * Les étapes de l'assistant d'activation, dans l'ordre où la maquette les numérote.
 *
 * `idle` n'est pas « la 2FA est inactive » : ce fait-là vit dans
 * `selectUser().twoFactorEnabled`, et lui seul. Ce magasin ne porte que ce qui est
 * **en cours** — deux détenteurs du même booléen finiraient par le contredire.
 */
export type TwoFactorStep = 'idle' | 'enrolling' | 'showingCodes';

interface TwoFactorState {
  step: TwoFactorStep;
  busy: boolean;
  error: string | null;
  /** Rendus en clair une seule fois par l'API ; jamais relisibles ensuite. */
  secret: string | null;
  otpauthUri: string | null;
  recoveryCodes: string[] | null;
}

const initialState: TwoFactorState = {
  step: 'idle',
  busy: false,
  error: null,
  secret: null,
  otpauthUri: null,
  recoveryCodes: null,
};

function messageOf(error: unknown): string {
  const body = error instanceof HttpErrorResponse ? error.error : null;
  if (isApiError(body)) {
    switch (body.code) {
      case 'E_INVALID_TWO_FACTOR_CODE':
        return 'Ce code est incorrect. Vérifiez l’heure de votre téléphone et réessayez.';
      case 'E_TWO_FACTOR_ALREADY_ENABLED':
        return 'La double authentification est déjà active sur ce compte.';
      case 'E_NO_PASSWORD_SET':
        return 'Ce compte se connecte via EirbConnect : il n’a pas de mot de passe à protéger.';
      case 'E_INVALID_CREDENTIALS':
        return 'Mot de passe incorrect.';
      case 'E_TWO_FACTOR_NOT_FOUND':
        return 'Aucune configuration en cours. Reprenez l’activation.';
    }
  }
  return 'Une erreur est survenue. Réessayez dans un instant.';
}

export const TwoFactorStore = signalStore(
  { providedIn: 'root' },
  withState<TwoFactorState>(initialState),
  withMethods((store, svc = inject(AccountSecurityService)) => ({
    /** Génère un secret en attente. Il ne garde rien avant `confirm()`. */
    async start(): Promise<void> {
      patchState(store, { busy: true, error: null });
      try {
        const enrolment = await lastValueFrom(svc.startEnrolment$());
        patchState(store, {
          busy: false,
          step: 'enrolling',
          secret: enrolment.secret,
          otpauthUri: enrolment.otpauthUri,
        });
      } catch (error) {
        patchState(store, { busy: false, error: messageOf(error) });
      }
    },

    /**
     * Prouve le secret et récupère les codes de secours.
     *
     * ⚠️ Le secret est effacé ici : il n'a plus aucune raison de rester en mémoire,
     * et le garder exposerait au premier rendu de trop ce que l'utilisateur est
     * censé n'avoir vu qu'une fois.
     */
    async confirm(code: string): Promise<boolean> {
      patchState(store, { busy: true, error: null });
      try {
        const codes = await lastValueFrom(svc.confirmEnrolment$(code));
        patchState(store, {
          busy: false,
          step: 'showingCodes',
          secret: null,
          otpauthUri: null,
          recoveryCodes: codes.recoveryCodes,
        });
        return true;
      } catch (error) {
        patchState(store, { busy: false, error: messageOf(error) });
        return false;
      }
    },

    async regenerate(): Promise<boolean> {
      patchState(store, { busy: true, error: null });
      try {
        const codes = await lastValueFrom(svc.regenerateRecoveryCodes$());
        patchState(store, {
          busy: false,
          step: 'showingCodes',
          recoveryCodes: codes.recoveryCodes,
        });
        return true;
      } catch (error) {
        patchState(store, { busy: false, error: messageOf(error) });
        return false;
      }
    },

    async disable(password: string): Promise<boolean> {
      patchState(store, { busy: true, error: null });
      try {
        await lastValueFrom(svc.disableTwoFactor$(password));
        patchState(store, initialState);
        return true;
      } catch (error) {
        patchState(store, { busy: false, error: messageOf(error) });
        return false;
      }
    },

    /**
     * Referme l'assistant **et oublie les codes**. Les garder en mémoire les
     * ferait réapparaître au prochain rendu de la page — ou sur une capture
     * d'écran — alors qu'ils n'existent que le temps de les noter.
     */
    reset(): void {
      patchState(store, initialState);
    },
  })),
);
