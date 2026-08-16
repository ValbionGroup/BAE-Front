import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { filter, map, take } from 'rxjs';
import { AuthState } from '#core/models/auth/auth-state.model';
import { selectAuthState } from '#core/store/auth/auth.selector';
import { AppRoutes } from '#app/app-routes.const';

type SettledAuthState = AuthState & { permissions: string[] };

/**
 * `permissions` défini — `[]` compris — signale que `/account/profile` a répondu,
 * dans un sens ou dans l'autre. Même convention que `permissionGuard`.
 */
const isSettled = (state: AuthState | undefined): state is SettledAuthState =>
  state?.permissions !== undefined;

/**
 * Le pendant d'`authGuard` : renvoie vers l'accueil quelqu'un de déjà connecté.
 *
 * Même contrainte, pour la même raison : le jeton n'est plus lisible côté client,
 * donc la décision attend que la réhydratation se règle. Sans l'attente, la page
 * de connexion s'afficherait une fraction de seconde à chaque rechargement avant
 * de rediriger — et surtout, un utilisateur connecté pourrait s'y reconnecter.
 */
export const guestGuard: CanActivateFn = () => {
  const router = inject(Router);
  const store = inject(Store);

  return store.select(selectAuthState).pipe(
    filter(isSettled),
    take(1),
    map((authState) =>
      authState.user === undefined ? true : router.createUrlTree([AppRoutes.home]),
    ),
  );
};
