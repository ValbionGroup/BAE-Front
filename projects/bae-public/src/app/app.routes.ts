import { Routes } from '@angular/router';

import { sessionGuard } from './core/session.guard';
import { guestGuard } from './core/guest.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/public-shell/public-shell').then((m) => m.PublicShell),
    children: [
      {
        path: '',
        pathMatch: 'full',
        title: 'BAE — Précommandes',
        loadComponent: () =>
          import('./pages/precommandes/precommandes').then((m) => m.Precommandes),
      },
      {
        path: 'fastpass',
        title: 'BAE — FastPass',
        loadComponent: () => import('./pages/fastpass/fastpass').then((m) => m.Fastpass),
      },
      {
        path: 'faq',
        title: 'BAE — Questions fréquentes',
        loadComponent: () => import('./pages/faq/faq').then((m) => m.Faq),
      },
      {
        path: 'contact',
        title: 'BAE — Contact',
        loadComponent: () => import('./pages/contact/contact').then((m) => m.Contact),
      },
      {
        path: 'profil',
        title: 'BAE — Mon profil',
        canActivate: [sessionGuard],
        loadComponent: () => import('./pages/profil/profil').then((m) => m.Profil),
      },
      {
        path: 'profil/commandes',
        title: 'BAE — Mes achats',
        canActivate: [sessionGuard],
        loadComponent: () => import('./pages/profil/commandes/commandes').then((m) => m.Commandes),
      },
      {
        path: 'commande/:id',
        title: 'BAE — Détail de la commande',
        canActivate: [sessionGuard],
        loadComponent: () => import('./pages/commande/commande').then((m) => m.Commande),
      },
      {
        // Cible de `browser_success_url` et `browser_fail_url` chez Lydia.
        // `withComponentInputBinding()` alimente l'`input.required` du composant.
        path: 'paiement/:orderRef',
        title: 'BAE — Paiement',
        canActivate: [sessionGuard],
        loadComponent: () => import('./pages/paiement/paiement').then((m) => m.Paiement),
      },
      {
        path: 'conditions',
        title: 'BAE — Mentions légales et conditions',
        loadComponent: () =>
          import('./pages/legal/conditions/conditions').then((m) => m.Conditions),
      },
      {
        path: 'confidentialite',
        title: 'BAE — Politique de confidentialité',
        loadComponent: () =>
          import('./pages/legal/confidentialite/confidentialite').then((m) => m.Confidentialite),
      },
      {
        path: 'login',
        title: 'BAE — Connexion',
        canActivate: [guestGuard],
        loadComponent: () => import('./pages/login/login').then((m) => m.Login),
      },
      { path: '**', redirectTo: '' },
    ],
  },
];
