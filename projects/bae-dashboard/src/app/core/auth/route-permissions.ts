import { AppRoutes } from '#app/app-routes.const';
import { Permission } from '#core/models/permission.model';

export const ROUTE_PERMISSIONS = {
  [AppRoutes.adherents]: 'client:read',
  [AppRoutes.stocks]: 'stock:read',
  [AppRoutes.recettes]: 'product:read',
  [AppRoutes.coordination]: 'job:read',
  [AppRoutes.logistique]: 'voucher:read',
  [AppRoutes.caisse]: 'order:write',
  [AppRoutes.precommandesAdmin]: 'order:write',
  [AppRoutes.soireeLive]: 'order:serve',
  [AppRoutes.soireeBilan]: 'event:settle',
  [AppRoutes.paiements]: 'transaction:read',
  [AppRoutes.equipe]: 'role:read',
} as const satisfies Readonly<Record<string, Permission>>;

export type GuardedRoute = keyof typeof ROUTE_PERMISSIONS;

export function permissionFor(route: string): Permission | null {
  return (ROUTE_PERMISSIONS as Readonly<Record<string, Permission>>)[route] ?? null;
}
