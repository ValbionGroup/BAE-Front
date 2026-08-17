import { AppRoutes } from '#app/app-routes.const';
import { Permission } from '#core/models/permission.model';

/**
 * La permission exigée par chaque route, **en un seul endroit**.
 *
 * `app.routes.ts` et la barre latérale lisent tous deux cette carte. C'est
 * délibéré : masquer une entrée sans garder sa route ne protège rien (l'URL
 * tapée à la main passe), et garder une route sans masquer son entrée offre un
 * lien qui rebondit vers l'accueil. Les deux moitiés doivent bouger ensemble,
 * donc elles ne sont pas écrites deux fois.
 *
 * La permission retenue est celle de la **lecture** de la page, pas de ses
 * boutons : on masque ce qui serait une impasse complète, on ne rejoue pas la
 * matrice du back. Les écritures restent gardées route par route côté serveur,
 * et le cas échéant bouton par bouton dans la page (cf. `soiree/live`).
 *
 * Une route absente de cette carte n'est gardée par rien — c'est le cas des
 * pages qui ne reposent que sur les permissions de base (accueil, présences,
 * analyse) et de celles qui n'appellent aucune API (`etats`, `parametres`).
 * Les routes enfants en sont absentes aussi : `stocks/scanner` et
 * `caisse/cloture` héritent du garde posé sur leur parent.
 */
export const ROUTE_PERMISSIONS = {
  [AppRoutes.adherents]: 'client:read',
  [AppRoutes.stocks]: 'stock:read',
  [AppRoutes.recettes]: 'product:read',
  [AppRoutes.coordination]: 'job:read',
  [AppRoutes.logistique]: 'voucher:read',
  [AppRoutes.caisse]: 'order:write',
  // Le comptoir de retrait partage son scanner avec la caisse (`POST /qr/verify`
  // est en `order:write`) : le découper seul le casserait.
  [AppRoutes.precommandesAdmin]: 'order:write',
  // Le kitchen display : consulter et faire avancer un ticket, rien de plus.
  // Clôture et relance de production sont gardées dans la page, pas ici.
  [AppRoutes.soireeLive]: 'order:serve',
  [AppRoutes.soireeBilan]: 'event:settle',
  [AppRoutes.paiements]: 'transaction:read',
  [AppRoutes.equipe]: 'role:read',
} as const satisfies Readonly<Record<string, Permission>>;

/** Une route qui figure dans la carte ci-dessus. */
export type GuardedRoute = keyof typeof ROUTE_PERMISSIONS;

/** La permission exigée par `route`, ou `null` si elle n'en exige aucune. */
export function permissionFor(route: string): Permission | null {
  return (ROUTE_PERMISSIONS as Readonly<Record<string, Permission>>)[route] ?? null;
}
