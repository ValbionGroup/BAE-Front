import { Routes } from '@angular/router';
import { Home } from '#pages/authed/home/home';
import { Login } from '#pages/guest/login/login';
import {AppShell} from '#pages/app-shell/app-shell';
import {Logistics} from '#pages/authed/logistics/logistics';
import {Coordination} from '#pages/authed/coordination/coordination';
import {Orders} from '#pages/authed/orders/orders';
import {Administration} from '#pages/authed/administration/administration';

export const AppRoutes = {
  home: '',
  login: 'login',
  forgotPassword: 'forgot-password',
  resetPassword: 'reset-password',
  logout: 'logout',
  live: 'live',
  'order-screen': 'order-screen',
  'available-recipe-screen': 'available-recipe-screen',
  logistics: {
    base: 'logistics',
    stock: 'stock',
    products: 'products',
    recipes: 'recipes',
    compare: 'compare',
    events: 'events',
  },
  coordination: {
    base: 'coordination',
    events: 'events',
    planning: 'planning',
  },
  orders: {
    base: 'orders',
    preorders: 'preorders',
    statistics: 'statistics',
    history: 'history',
  },
  administration: {
    base: 'administration',
    members: 'members',
    cotisation: 'cotisation',
  }
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
      },
      {
        path: AppRoutes.logistics.base,
        children: [
          {
            path: AppRoutes.logistics.stock,
            component: Logistics
          },
          {
            path: AppRoutes.logistics.products,
            component: Logistics
          },
          {
            path: AppRoutes.logistics.recipes,
            component: Logistics
          },
          {
            path: AppRoutes.logistics.compare,
            component: Logistics
          },
          {
            path: AppRoutes.logistics.events,
            component: Logistics
          }
        ]
      },
      {
        path: AppRoutes.coordination.base,
        children: [
          {
            path: AppRoutes.coordination.planning,
            component: Coordination
          },
          {
            path: AppRoutes.coordination.events,
            component: Coordination
          }
        ]
      },
      {
        path: AppRoutes.orders.base,
        children: [
          {
            path: AppRoutes.orders.preorders,
            component: Orders
          },
          {
            path: AppRoutes.orders.statistics,
            component: Orders
          },
          {
            path: AppRoutes.orders.history,
            component: Orders
          }
        ]
      },
      {
        path: AppRoutes.administration.base,
        children: [
          {
            path: AppRoutes.administration.members,
            component: Administration
          },
          {
            path: AppRoutes.administration.cotisation,
            component: Administration
          }
        ]
      }
    ]
  },
];
