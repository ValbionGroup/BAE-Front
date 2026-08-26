import { AppRoutes } from '#app/app-routes.const';
import { Permission } from '#core/models/permission.model';

/**
 * ⚠️ Une valeur peut être **une permission ou une liste**, et une liste se lit
 * « **au moins une** », jamais « toutes ».
 *
 * La liste existe pour les écrans qui réunissent plusieurs domaines — les
 * Référentiels rassemblent catégories, enseignes et postes, et un membre qui
 * n'en porte qu'un doit pouvoir ouvrir la page et n'y voir que son onglet.
 *
 * Elle vit ici, dans la source, et non dans une variante du garde de route :
 * `permissionFor()` alimente **aussi** `Sidebar.visible()`, et deux règles
 * séparées finiraient par afficher une entrée de menu que la page refuse
 * d'ouvrir — ou l'inverse.
 */
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
  [AppRoutes.referentiels]: ['category:read', 'supplier:read', 'job:read', 'product:read'],
} as const satisfies Readonly<Record<string, Permission | readonly Permission[]>>;

export type GuardedRoute = keyof typeof ROUTE_PERMISSIONS;

/**
 * Les permissions exigées par une route, **dont une seule suffit**.
 *
 * Tableau vide = route non gardée. Un seul élément = le cas courant, et il se
 * lit exactement comme avant pour les onze routes historiques.
 */
export function permissionFor(route: string): readonly Permission[] {
  const required = (
    ROUTE_PERMISSIONS as Readonly<Record<string, Permission | readonly Permission[]>>
  )[route];

  if (required === undefined) return [];
  return Array.isArray(required) ? required : [required as Permission];
}
