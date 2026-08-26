import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import { AuthState } from '#core/models/auth/auth-state.model';
import { selectAuthState } from '#core/store/auth/auth.selector';
import { AppRoutes } from '#app/app-routes.const';
import { Permission } from '#core/models/permission.model';
import { GuardedRoute, permissionFor } from '#core/auth/route-permissions';

type SettledAuthState = AuthState & { permissions: string[] };

const isSettled = (state: AuthState | undefined): state is SettledAuthState =>
  state?.permissions !== undefined;

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
 * Accorde dès qu'**une** des permissions attendues est portée. Une liste vide
 * n'exige rien : une route sans entrée dans `ROUTE_PERMISSIONS` reste ouverte,
 * comme avant.
 */
export const permissionGuardAny =
  (required: readonly Permission[]): CanActivateFn =>
  () => {
    const router = inject(Router);
    const store = inject(Store);

    return store.select(selectAuthState).pipe(
      filter(isSettled),
      take(1),
      map(({ permissions }) => {
        const granted =
          required.length === 0 || required.some((needed) => permissions.includes(needed));
        return granted || router.createUrlTree([AppRoutes.home]);
      }),
    );
  };

export const permissionGuardFor = (route: GuardedRoute): CanActivateFn =>
  permissionGuardAny(permissionFor(route));
