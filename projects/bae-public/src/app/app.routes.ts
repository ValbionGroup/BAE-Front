import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    loadComponent: () => import('./pages/precommandes/precommandes').then((m) => m.Precommandes),
  },
  {
    /**
     * Route **obligatoire** : en cas d'échec du SSO, le back redirige vers
     * `${PUBLIC_APP_URL}/login?sso_error=<code>`.
     */
    path: 'login',
    loadComponent: () => import('./pages/login/login').then((m) => m.Login),
  },
  { path: '**', redirectTo: '' },
];
