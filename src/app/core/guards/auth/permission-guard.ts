import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import { AuthState } from '#core/models/auth/auth-state.model';
import { selectAuthState } from '#core/store/auth/auth.selector';
import { AppRoutes } from '#app/app-routes.const';
import { Permission } from '#core/models/permission.model';
import { GuardedRoute, ROUTE_PERMISSIONS } from '#core/auth/route-permissions';

type SettledAuthState = AuthState & { permissions: string[] };

const isSettled = (state: AuthState | undefined): state is SettledAuthState =>
  state?.permissions !== undefined;

/**
 * Empêche d'atterrir sur une page dont toutes les requêtes répondraient 403.
 *
 * `provideAppInitializer` ne bloque pas le routage sur la réponse de
 * `/account/profile` : au premier rendu (rechargement de page, lien direct),
 * `permissions` peut encore être `undefined`. Le garde attend donc que le
 * profil se règle (`permissions` défini, y compris `[]` après un échec)
 * avant de trancher, plutôt que de lire une valeur qui n'est pas encore là.
 */
export const permissionGuard =
  (permission: Permission): CanActivateFn =>
  () => {
    const router = inject(Router);
    const store = inject(Store);

    return store.select(selectAuthState).pipe(
      filter(isSettled),
      take(1),
      map(
        ({ permissions }) =>
          permissions.includes(permission) || router.createUrlTree([AppRoutes.home]),
      ),
    );
  };

/**
 * Le même garde, mais sa permission vient de `ROUTE_PERMISSIONS` plutôt que
 * d'un littéral écrit sur place. C'est la forme à utiliser dans `app.routes.ts` :
 * elle rend impossible qu'une route soit gardée par une permission et son
 * entrée de menu masquée par une autre.
 */
export const permissionGuardFor = (route: GuardedRoute): CanActivateFn =>
  permissionGuard(ROUTE_PERMISSIONS[route]);
