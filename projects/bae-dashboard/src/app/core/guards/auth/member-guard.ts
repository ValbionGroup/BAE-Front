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
 * dans un sens ou dans l'autre. Même convention que `authGuard`.
 */
const isSettled = (state: AuthState | undefined): state is SettledAuthState =>
  state?.permissions !== undefined;

/**
 * Sépare « connecté » de « connecté **ici** ». Le dashboard et la zone publique
 * partagent le même cookie de session : un adhérent venu de `bae-public` a donc
 * un `user` valide, et `authGuard` seul le laisserait entrer. Ce qui le
 * distingue est l'absence de ligne `members`, que le profil rend en `member:
 * null`.
 *
 * À ne pas confondre avec `permissionGuard` : un membre sans rôle n'a aucune
 * permission mais reste chez lui — accueil, présences, paramètres. Le refus
 * porte sur l'appartenance, jamais sur les droits.
 *
 * Se tait quand personne n'est connecté : `authGuard` est déclaré avant lui et
 * court-circuite la chaîne, à lui d'envoyer vers la connexion.
 */
export const memberGuard: CanActivateFn = () => {
  const router = inject(Router);
  const store = inject(Store);

  return store.select(selectAuthState).pipe(
    filter(isSettled),
    take(1),
    map(
      ({ user, member }) =>
        user === undefined || member != null || router.createUrlTree([AppRoutes.accesRefuse]),
    ),
  );
};
