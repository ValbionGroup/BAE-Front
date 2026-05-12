import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import { provideLucideConfig } from '@lucide/angular';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { apiCaseRequestInterceptor } from '#core/interceptors/api-case-request/api-case-request-interceptor';
import { authInterceptor } from '#core/interceptors/auth/auth-interceptor';
import { errorInterceptor } from '#core/interceptors/error/error-interceptor';
import { apiResponseCaseInterceptor } from '#core/interceptors/api-case-response/api-case-response-interceptor';
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
    }),
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        apiCaseRequestInterceptor,
        authInterceptor,
        errorInterceptor,
        apiResponseCaseInterceptor,
      ]),
    ),
    storeConfig,
    provideEffects([AuthEffects]),
    providePrimeNG({
      ripple: true,
      theme: {
        preset: Aura,
      },
    }),
    provideLucideConfig({
      strokeWidth: 2,
    }),
  ],
};
