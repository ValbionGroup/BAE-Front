import { Routes } from '@angular/router';
import { Login } from '#pages/guest/login/login';
import { AppShell } from '#pages/app-shell/app-shell';
import { Home } from '#pages/authed/home/home';
import { Presences } from '#pages/authed/presences/presences';
import { Stocks } from '#pages/authed/stocks/stocks';
import { Recettes } from '#pages/authed/recettes/recettes';
import { Coordination } from '#pages/authed/coordination/coordination';
import { CoordinationEvents } from '#pages/authed/coordination/events/events';
import { Logistique } from '#pages/authed/logistique/logistique';
import { LogistiqueEvents } from '#pages/authed/logistique/events/events';
import { Caisse } from '#pages/authed/caisse/caisse';
import { Precommandes } from '#pages/public/precommandes/precommandes';
import { Paiements } from '#pages/authed/paiements/paiements';
import { Analyse } from '#pages/authed/analyse/analyse';
import { Tickets } from '#pages/authed/tickets/tickets';
import { Parametres } from '#pages/authed/parametres/parametres';
import { authGuard } from '#core/guards/auth/auth-guard';
import { guestGuard } from '#core/guards/auth/guest-guard';

export const AppRoutes = {
  home: '',
  presences: 'presences',
  stocks: 'stocks',
  recettes: 'recettes',
  coordination: 'coordination',
  logistique: 'logistique',
  caisse: 'caisse',
  precommandes: 'precommandes',
  paiements: 'paiements',
  analyse: 'analyse',
  tickets: 'tickets',
  parametres: 'parametres',
  login: 'login',
} as const;

export const routes: Routes = [
  // Public — anyone (signed-in or not) can place precommandes.
  // Lives at the top level so it bypasses both the auth shell and any guards.
  {
    path: AppRoutes.precommandes,
    component: Precommandes,
  },
  {
    path: AppRoutes.login,
    canActivate: [guestGuard],
    component: Login,
  },
  {
    path: '',
    component: AppShell,
    canActivate: [authGuard],
    children: [
      { path: AppRoutes.home, component: Home },
      { path: AppRoutes.presences, component: Presences },
      { path: AppRoutes.stocks, component: Stocks },
      { path: AppRoutes.recettes, component: Recettes },
      {
        path: AppRoutes.coordination,
        children: [
          { path: '', component: CoordinationEvents, pathMatch: 'full' },
          { path: ':id', component: Coordination },
        ],
      },
      {
        path: AppRoutes.logistique,
        children: [
          { path: '', component: LogistiqueEvents, pathMatch: 'full' },
          { path: ':id', component: Logistique },
        ],
      },
      { path: AppRoutes.caisse, component: Caisse },
      { path: AppRoutes.paiements, component: Paiements },
      { path: AppRoutes.analyse, component: Analyse },
      { path: AppRoutes.tickets, component: Tickets },
      { path: AppRoutes.parametres, component: Parametres },
    ],
  },
  { path: '**', redirectTo: '' },
];
