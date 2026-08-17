import {
  ApplicationConfig,
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
  ThemeService,
} from '@bae/ui';
import { provideEffects } from '@ngrx/effects';
import { AuthEffects } from '#core/store/auth/auth.effect';
import { storeConfig } from '#app/app-store.config';
import { rehydrateAuth } from '#core/store/auth/auth.actions';
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
    provideLucideConfig({
      strokeWidth: 2,
    }),
  ],
};
