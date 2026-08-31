import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { Store } from '@ngrx/store';
import { lastValueFrom } from 'rxjs';
import { messageOf } from '@bae/ui';
import { TelegramService } from '#core/services/telegram/telegram-service';
import { telegramLinkChanged } from '#core/store/auth/auth.actions';

interface TelegramState {
  busy: boolean;
  error: string | null;
}

const initialState: TelegramState = { busy: false, error: null };

/**
 * La liaison Telegram, côté dashboard. L'état lié lui-même n'est pas ici : il vit
 * dans `auth.user.telegram`, que le profil règle au démarrage — deux détenteurs
 * du même booléen finiraient par le contredire.
 */
export const TelegramStore = signalStore(
  { providedIn: 'root' },
  withState<TelegramState>(initialState),
  withMethods((store, svc = inject(TelegramService), auth = inject(Store)) => ({
    /**
     * Rend l'URL à ouvrir, ou `null` quand le serveur refuse — un compte déjà lié
     * doit être délié d'abord.
     */
    async startLink(): Promise<string | null> {
      patchState(store, { busy: true, error: null });

      try {
        const ticket = await lastValueFrom(svc.startLink$());
        return ticket.url;
      } catch (error: unknown) {
        patchState(store, { error: messageOf(error, 'Le lien Telegram n’a pas pu être créé.') });
        return null;
      } finally {
        patchState(store, { busy: false });
      }
    },

    async unlink(): Promise<boolean> {
      patchState(store, { busy: true, error: null });

      try {
        const telegram = await lastValueFrom(svc.unlink$());
        auth.dispatch(telegramLinkChanged({ telegram }));
        return true;
      } catch (error: unknown) {
        patchState(store, { error: messageOf(error, 'La déliaison n’a pas pu aboutir.') });
        return false;
      } finally {
        patchState(store, { busy: false });
      }
    },

    clearError(): void {
      patchState(store, { error: null });
    },
  })),
);
