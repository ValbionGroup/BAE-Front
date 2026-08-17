import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
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
      // Le thème doit s'appliquer avant le premier rendu, sinon la page
      // s'affiche en sombre puis bascule.
      inject(ThemeService);
      // Résout la session au démarrage : les gardes attendent ce verdict plutôt
      // que de conclure « déconnecté » sur un état encore inconnu.
      inject(SessionStore).load();
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(
      withInterceptors([
        apiCaseRequestInterceptor,
        authInterceptor,
        // Après `authInterceptor` : `withCredentials` doit déjà être posé, sinon
        // le cookie CSRF ne partirait pas avec l'en-tête qui le recopie.
        csrfInterceptor,
        errorInterceptor,
        apiResponseCaseInterceptor,
        apiEnvelopeInterceptor,
      ]),
    ),
    provideLucideConfig({ strokeWidth: 2 }),
  ],
};
