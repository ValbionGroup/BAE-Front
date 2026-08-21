import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideLucideConfig } from '@lucide/angular';
import {
  ThemeService,
  apiCaseRequestInterceptor,
  apiEnvelopeInterceptor,
  apiResponseCaseInterceptor,
  authInterceptor,
  csrfInterceptor,
  errorInterceptor,
} from '@bae/ui';

import { routes } from './app.routes';
import { SessionStore } from './core/session.store';

/**
 * Volontairement plus maigre que celle du dashboard : **ni `@ngrx/store`, ni
 * `provideEffects`, ni garde de permission**. Une page ouverte sur Internet n'a
 * aucune raison d'embarquer le magasin d'administration, et c'est cette absence
 * — pas une convention — qui garantit qu'il ne finira pas dans le paquet.
 */
export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(() => {
      inject(ThemeService);
      inject(SessionStore).load();
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withComponentInputBinding(),
      withInMemoryScrolling({ anchorScrolling: 'enabled' }),
    ),
    provideHttpClient(
      withInterceptors([
        apiCaseRequestInterceptor,
        authInterceptor,
        csrfInterceptor,
        errorInterceptor,
        apiResponseCaseInterceptor,
        apiEnvelopeInterceptor,
      ]),
    ),
    provideLucideConfig({ strokeWidth: 2 }),
  ],
};
