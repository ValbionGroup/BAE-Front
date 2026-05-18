import { Routes } from '@angular/router';
import { Login } from '#pages/guest/login/login';
import { AppShell } from '#pages/app-shell/app-shell';
import { Home } from '#pages/authed/home/home';
import { Presences } from '#pages/authed/presences/presences';
import { MyPresences } from '#pages/authed/my-presences/my-presences';
import { Stocks } from '#pages/authed/stocks/stocks';
import { StocksScanner } from '#pages/authed/stocks/scanner/scanner';
import { Recettes } from '#pages/authed/recettes/recettes';
import { Coordination } from '#pages/authed/coordination/coordination';
import { CoordinationEvents } from '#pages/authed/coordination/events/events';
import { Logistique } from '#pages/authed/logistique/logistique';
import { LogistiqueEvents } from '#pages/authed/logistique/events/events';
import { Caisse } from '#pages/authed/caisse/caisse';
import { CaisseCloture } from '#pages/authed/caisse/cloture/cloture';
import { Precommandes } from '#pages/public/precommandes/precommandes';
import { PrecommandesAdmin } from '#pages/authed/precommandes-admin/precommandes-admin';
import { Paiements } from '#pages/authed/paiements/paiements';
import { Analyse } from '#pages/authed/analyse/analyse';
import { Tickets } from '#pages/authed/tickets/tickets';
import { Parametres } from '#pages/authed/parametres/parametres';
import { ParametresSecurite } from '#pages/authed/parametres/securite/securite';
import { ParametresIntegrations } from '#pages/authed/parametres/integrations/integrations';
import { ParametresModules } from '#pages/authed/parametres/modules/modules';
import { Adherents } from '#pages/authed/adherents/adherents';
import { SoireeLive } from '#pages/authed/soiree/live/live';
import { SoireeBilan } from '#pages/authed/soiree/bilan/bilan';
import { Notifications } from '#pages/authed/notifications/notifications';
import { Equipe } from '#pages/authed/equipe/equipe';
import { Etats } from '#pages/authed/etats/etats';
import { NotFound } from '#pages/states/not-found';
import { authGuard } from '#core/guards/auth/auth-guard';
import { guestGuard } from '#core/guards/auth/guest-guard';

export const AppRoutes = {
  home: '',
  presences: 'presences',
  myPresences: 'presences/my',
  adherents: 'adherents',
  stocks: 'stocks',
  stocksScanner: 'stocks/scanner',
  recettes: 'recettes',
  coordination: 'coordination',
  logistique: 'logistique',
  caisse: 'caisse',
  caisseCloture: 'caisse/cloture',
  precommandes: 'public/precommandes',
  precommandesAdmin: 'precommandes',
  soiree: 'soiree',
  soireeLive: 'soiree/live',
  soireeBilan: 'soiree/bilan',
  paiements: 'paiements',
  analyse: 'analyse',
  tickets: 'tickets',
  notifications: 'notifications',
  parametres: 'parametres',
  parametresSecurite: 'parametres/securite',
  parametresIntegrations: 'parametres/integrations',
  parametresModules: 'parametres/modules',
  equipe: 'equipe',
  etats: 'etats',
  login: 'login',
} as const;

export const routes: Routes = [
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
      {
        path: AppRoutes.presences,
        children: [
          { path: '', component: Presences, pathMatch: 'full' },
          { path: 'my', component: MyPresences },
        ],
      },
      { path: AppRoutes.adherents, component: Adherents },
      {
        path: AppRoutes.stocks,
        children: [
          { path: '', component: Stocks, pathMatch: 'full' },
          { path: 'scanner', component: StocksScanner },
        ],
      },
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
      {
        path: AppRoutes.caisse,
        children: [
          { path: '', component: Caisse, pathMatch: 'full' },
          { path: 'cloture', component: CaisseCloture },
        ],
      },
      { path: AppRoutes.precommandesAdmin, component: PrecommandesAdmin },
      {
        path: AppRoutes.soiree,
        children: [
          { path: '', redirectTo: 'live', pathMatch: 'full' },
          { path: 'live', component: SoireeLive },
          { path: 'bilan', component: SoireeBilan },
        ],
      },
      { path: AppRoutes.paiements, component: Paiements },
      { path: AppRoutes.analyse, component: Analyse },
      { path: AppRoutes.tickets, component: Tickets },
      { path: AppRoutes.notifications, component: Notifications },
      {
        path: AppRoutes.parametres,
        children: [
          { path: '', component: Parametres, pathMatch: 'full' },
          { path: 'securite', component: ParametresSecurite },
          { path: 'integrations', component: ParametresIntegrations },
          { path: 'modules', component: ParametresModules },
        ],
      },
      { path: AppRoutes.equipe, component: Equipe },
      { path: AppRoutes.etats, component: Etats },
    ],
  },
  { path: '**', component: NotFound },
];
