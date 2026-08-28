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
      inject(ThemeService);
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
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
    storeConfig,
    provideEffects([AuthEffects]),
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
