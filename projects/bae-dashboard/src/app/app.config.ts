import {
  ApplicationConfig,
  Injector,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideLucideConfig } from '@lucide/angular';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import {
  apiCaseRequestInterceptor,
  authInterceptor,
  csrfInterceptor,
  errorInterceptor,
  apiResponseCaseInterceptor,
  apiEnvelopeInterceptor,
  SESSION_EXPIRED_HANDLER,
  ThemeService,
} from '@bae/ui';
import { provideEffects } from '@ngrx/effects';
import { AuthEffects } from '#core/store/auth/auth.effect';
import { storeConfig } from '#app/app-store.config';
import { rehydrateAuth, sessionExpired } from '#core/store/auth/auth.actions';
import { Store } from '@ngrx/store';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      const store = inject(Store);
      store.dispatch(rehydrateAuth());
      // Instantiate ThemeService eagerly so the .light class is applied before first paint.
      inject(ThemeService);
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        apiCaseRequestInterceptor,
        authInterceptor,
        // Après `authInterceptor` : il faut que `withCredentials` soit déjà posé,
        // sinon le cookie CSRF ne partirait pas avec l'en-tête qui le recopie.
        csrfInterceptor,
        errorInterceptor,
        apiResponseCaseInterceptor,
        apiEnvelopeInterceptor,
      ]),
    ),
    storeConfig,
    provideEffects([AuthEffects]),
    /**
     * Ce que `errorInterceptor` déclenche sur un 401 de navigation. Le crochet
     * vit ici plutôt que dans `bae/ui` parce que la bibliothèque est partagée
     * avec la zone publique, qui n'a ni magasin ni notion de déconnexion.
     *
     * ⚠️ `Store` est résolu **à l'appel**, pas à la fabrication : la chaîne
     * `HttpClient → intercepteur → crochet` se construit au tout début de
     * l'amorçage, et exiger le magasin à cet instant nouerait une dépendance
     * circulaire avec les effets, qui eux réclament `HttpClient`.
     */
    {
      provide: SESSION_EXPIRED_HANDLER,
      useFactory: () => {
        const injector = inject(Injector);
        return () => injector.get(Store).dispatch(sessionExpired());
      },
    },
    provideLucideConfig({
      strokeWidth: 2,
    }),
  ],
};
