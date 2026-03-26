import { Routes } from '@angular/router';
import { Home } from '#pages/authed/home/home';
import { Login } from '#pages/guest/login/login';
import {AppShell} from '#pages/app-shell/app-shell';

export const AppRoutes = {
  home: '',
  login: 'login',
  forgotPassword: 'forgot-password',
  resetPassword: 'reset-password',
};

export const routes: Routes = [
  {
    path: AppRoutes.login,
    component: Login,
  },
  {
    path: '',
    component: AppShell,
    children: [
      {
        path: AppRoutes.home,
        component: Home,
      }
    ]
  },
];
