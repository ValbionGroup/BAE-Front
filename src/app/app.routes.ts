import { Routes } from '@angular/router';
import { AppRoutes } from './app-routes.const';
import { AppShell } from '#pages/app-shell/app-shell';
import { authGuard } from '#core/guards/auth/auth-guard';
import { guestGuard } from '#core/guards/auth/guest-guard';
import { permissionGuard } from '#core/guards/auth/permission-guard';

export { AppRoutes } from './app-routes.const';

export const routes: Routes = [
  {
    path: AppRoutes.precommandes,
    loadComponent: () =>
      import('#pages/public/precommandes/precommandes').then((m) => m.Precommandes),
  },
  {
    path: AppRoutes.login,
    canActivate: [guestGuard],
    loadComponent: () => import('#pages/guest/login/login').then((m) => m.Login),
  },
  { path: AppRoutes.soiree, pathMatch: 'full', redirectTo: AppRoutes.soireeLive },
  // Hors `AppShell` : le kitchen display occupe l'écran entier, sans menu
  // latéral — c'est un poste de service, pas une page de navigation.
  {
    path: AppRoutes.soireeLive,
    canActivate: [authGuard],
    loadComponent: () => import('#pages/authed/soiree/live/live').then((m) => m.SoireeLive),
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      {
        path: AppRoutes.home,
        loadComponent: () => import('#pages/authed/home/home').then((m) => m.Home),
      },
      {
        path: AppRoutes.presences,
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('#pages/authed/presences/presences').then((m) => m.Presences),
          },
          {
            path: 'my',
            loadComponent: () =>
              import('#pages/authed/my-presences/my-presences').then((m) => m.MyPresences),
          },
        ],
      },
      {
        path: AppRoutes.adherents,
        canActivate: [permissionGuard('client:read')],
        loadComponent: () => import('#pages/authed/adherents/adherents').then((m) => m.Adherents),
      },
      {
        path: AppRoutes.stocks,
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('#pages/authed/stocks/stocks').then((m) => m.Stocks),
          },
          {
            path: 'scanner',
            loadComponent: () =>
              import('#pages/authed/stocks/scanner/scanner').then((m) => m.StocksScanner),
          },
        ],
      },
      {
        path: AppRoutes.recettes,
        loadComponent: () => import('#pages/authed/recettes/recettes').then((m) => m.Recettes),
      },
      {
        path: AppRoutes.coordination,
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('#pages/authed/coordination/events/events').then((m) => m.CoordinationEvents),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('#pages/authed/coordination/coordination').then((m) => m.Coordination),
          },
        ],
      },
      {
        path: AppRoutes.logistique,
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('#pages/authed/logistique/events/events').then((m) => m.LogistiqueEvents),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('#pages/authed/logistique/logistique').then((m) => m.Logistique),
          },
        ],
      },
      {
        path: AppRoutes.caisse,
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('#pages/authed/caisse/caisse').then((m) => m.Caisse),
          },
          {
            path: 'cloture',
            loadComponent: () =>
              import('#pages/authed/caisse/cloture/cloture').then((m) => m.CaisseCloture),
          },
        ],
      },
      {
        path: AppRoutes.precommandesAdmin,
        loadComponent: () =>
          import('#pages/authed/precommandes-admin/precommandes-admin').then(
            (m) => m.PrecommandesAdmin,
          ),
      },
      {
        path: AppRoutes.soiree,
        children: [
          {
            path: 'bilan',
            loadComponent: () =>
              import('#pages/authed/soiree/bilan/bilan').then((m) => m.SoireeBilan),
          },
        ],
      },
      {
        path: AppRoutes.paiements,
        loadComponent: () => import('#pages/authed/paiements/paiements').then((m) => m.Paiements),
      },
      {
        path: AppRoutes.analyse,
        loadComponent: () => import('#pages/authed/analyse/analyse').then((m) => m.Analyse),
      },
      {
        path: AppRoutes.tickets,
        loadComponent: () => import('#pages/authed/tickets/tickets').then((m) => m.Tickets),
      },
      {
        path: AppRoutes.notifications,
        loadComponent: () =>
          import('#pages/authed/notifications/notifications').then((m) => m.Notifications),
      },
      {
        path: AppRoutes.parametres,
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () =>
              import('#pages/authed/parametres/parametres').then((m) => m.Parametres),
          },
          {
            path: 'preferences',
            loadComponent: () =>
              import('#pages/authed/parametres/preferences/preferences').then(
                (m) => m.ParametresPreferences,
              ),
          },
          {
            path: 'securite',
            loadComponent: () =>
              import('#pages/authed/parametres/securite/securite').then(
                (m) => m.ParametresSecurite,
              ),
          },
        ],
      },
      {
        path: AppRoutes.equipe,
        canActivate: [permissionGuard('role:read')],
        loadComponent: () => import('#pages/authed/equipe/equipe').then((m) => m.Equipe),
      },
      {
        path: AppRoutes.etats,
        loadComponent: () => import('#pages/authed/etats/etats').then((m) => m.Etats),
      },
    ],
  },
  {
    path: '**',
    loadComponent: () => import('#pages/states/not-found').then((m) => m.NotFound),
  },
];
