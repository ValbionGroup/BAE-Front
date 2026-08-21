import { Routes } from '@angular/router';
import { AppRoutes } from './app-routes.const';
import { AppShell } from '#pages/app-shell/app-shell';
import { authGuard } from '#core/guards/auth/auth-guard';
import { guestGuard } from '#core/guards/auth/guest-guard';
import { memberGuard } from '#core/guards/auth/member-guard';
import { permissionGuardFor } from '#core/guards/auth/permission-guard';
import { twoFactorChallengeGuard } from '#core/guards/auth/two-factor-challenge-guard';

export { AppRoutes } from './app-routes.const';

export const routes: Routes = [
  {
    path: AppRoutes.login,
    canActivate: [guestGuard],
    loadComponent: () => import('#pages/guest/login/login').then((m) => m.Login),
  },
  {
    path: AppRoutes.loginTwoFactor,
    canActivate: [guestGuard, twoFactorChallengeGuard],
    loadComponent: () => import('#pages/guest/two-factor/two-factor').then((m) => m.LoginTwoFactor),
  },
  {
    path: AppRoutes.motDePasseOublie,
    canActivate: [guestGuard],
    loadComponent: () =>
      import('#pages/guest/mot-de-passe-oublie/mot-de-passe-oublie').then(
        (m) => m.MotDePasseOublie,
      ),
  },
  /**
   * ⚠️ Sans `guestGuard`, délibérément. Quelqu'un dont la session est encore
   * vivante ailleurs — et qui clique le lien reçu dans sa boîte mail — doit
   * pouvoir s'en servir. `guestGuard` le renverrait vers l'accueil, c'est-à-dire
   * précisément pour les gens qui ont le plus besoin de ce parcours.
   */
  {
    path: AppRoutes.reinitialiserMotDePasse,
    loadComponent: () =>
      import('#pages/guest/reinitialiser-mot-de-passe/reinitialiser-mot-de-passe').then(
        (m) => m.ReinitialiserMotDePasse,
      ),
  },
  {
    path: AppRoutes.accesRefuse,
    loadComponent: () => import('#pages/states/forbidden/forbidden').then((m) => m.Forbidden),
  },
  { path: AppRoutes.soiree, pathMatch: 'full', redirectTo: AppRoutes.soireeLive },
  {
    path: AppRoutes.soireeLive,
    canActivate: [authGuard, memberGuard, permissionGuardFor(AppRoutes.soireeLive)],
    loadComponent: () => import('#pages/authed/soiree/live/live').then((m) => m.SoireeLive),
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard, memberGuard],
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
        canActivate: [permissionGuardFor(AppRoutes.adherents)],
        loadComponent: () => import('#pages/authed/adherents/adherents').then((m) => m.Adherents),
      },
      {
        path: AppRoutes.stocks,
        canActivate: [permissionGuardFor(AppRoutes.stocks)],
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
        canActivate: [permissionGuardFor(AppRoutes.recettes)],
        loadComponent: () => import('#pages/authed/recettes/recettes').then((m) => m.Recettes),
      },
      {
        path: AppRoutes.coordination,
        canActivate: [permissionGuardFor(AppRoutes.coordination)],
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
        canActivate: [permissionGuardFor(AppRoutes.logistique)],
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
        canActivate: [permissionGuardFor(AppRoutes.caisse)],
        children: [
          {
            path: '',
            pathMatch: 'full',
            loadComponent: () => import('#pages/authed/caisse/caisse').then((m) => m.Caisse),
          },
        ],
      },
      {
        path: AppRoutes.precommandesAdmin,
        canActivate: [permissionGuardFor(AppRoutes.precommandesAdmin)],
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
            canActivate: [permissionGuardFor(AppRoutes.soireeBilan)],
            loadComponent: () =>
              import('#pages/authed/soiree/bilan/bilan').then((m) => m.SoireeBilan),
          },
        ],
      },
      {
        path: AppRoutes.paiements,
        canActivate: [permissionGuardFor(AppRoutes.paiements)],
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
        canActivate: [permissionGuardFor(AppRoutes.equipe)],
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
