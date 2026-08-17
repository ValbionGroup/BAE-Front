import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
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
 * ⚠️ **Ce garde ne peut plus rien décider de façon synchrone.** Il s'appuyait sur
 * la présence d'un jeton en `localStorage` — un test local et immédiat. Avec un
 * cookie `httpOnly`, cette information **n'existe plus côté client** : seul le
 * serveur peut dire si la session vaut quelque chose.
 *
 * Il attend donc que la réhydratation se règle avant de trancher. Sans cette
 * attente, il redirigerait vers `/login` à **chaque rechargement de page**, avant
 * même que `/account/profile` ait répondu — et l'utilisateur serait déconnecté
 * par un simple F5.
 */
export const authGuard: CanActivateFn = (
  _route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {
  const router = inject(Router);
  const store = inject(Store);

  return store.select(selectAuthState).pipe(
    filter(isSettled),
    take(1),
    map(
      (authState) =>
        authState.user !== undefined ||
        router.createUrlTree([AppRoutes.login], { queryParams: { redirectTo: state.url } }),
    ),
  );
};
