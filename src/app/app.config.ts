import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { providePrimeNG } from 'primeng/config';
import Aura from '@primeuix/themes/aura';
import {provideLucideConfig} from '@lucide/angular';
import {provideHttpClient, withInterceptors} from '@angular/common/http';
import {apiCaseRequestInterceptor} from '#core/interceptors/api-case-request/api-case-request-interceptor';
import {authInterceptor} from '#core/interceptors/auth/auth-interceptor';
import {errorInterceptor} from '#core/interceptors/error/error-interceptor';
import {apiResponseCaseInterceptor} from '#core/interceptors/api-case-response/api-case-response-interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([
        apiCaseRequestInterceptor,
        authInterceptor,
        errorInterceptor,
        apiResponseCaseInterceptor
      ])
    ),
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
