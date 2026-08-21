import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from '#core/models/auth/auth-state.model';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUser = createSelector(selectAuthState, (state: AuthState) => state.user);

export const selectMember = createSelector(selectAuthState, (state: AuthState) => state.member);

export const selectLoginError = createSelector(
  selectAuthState,
  (state: AuthState) => state.loginError,
);

export const selectTwoFactorPending = createSelector(
  selectAuthState,
  (state: AuthState) => state.twoFactorPending === true,
);

export const selectTwoFactorError = createSelector(
  selectAuthState,
  (state: AuthState) => state.twoFactorError,
);

/**
 * `undefined` (profil pas encore réglé) et `[]` (réglé, rien d'accordé)
 * deviennent tous deux `[]` ici. Correct pour un affichage, qui n'a de
 * toute façon rien à montrer avant que le profil réponde — mais ce
 * sélecteur ne convient à rien qui doive distinguer ces deux états, un
 * garde de route en particulier : voir `selectHasPermission` ci-dessous.
 */
export const selectPermissions = createSelector(
  selectAuthState,
  (state: AuthState) => state.permissions ?? [],
);

/**
 * Le front n'évite que les impasses : ce sélecteur masque ce que le back
 * refuserait, il n'autorise rien. Toute décision reste au serveur.
 *
 * Pour un composant, qui n'a qu'à afficher : `undefined` et `[]` se lisent
 * tous deux « rien à montrer », ce que `selectPermissions` donne déjà.
 *
 * Pas pour un garde de route. `selectPermissions` confond « profil pas
 * encore réglé » et « réglé, rien d'accordé » derrière le même `[]` ; un
 * garde bâti dessus refuserait l'accès avant même que le profil ait
 * répondu. `permissionGuard` lit `selectAuthState` directement et attend
 * que `permissions` soit défini avant de décider.
 *
 * Par ailleurs cette fabrique construit un sélecteur NEUF à chaque appel :
 * un composant qui l'utiliserait ne pourrait jamais être piloté par
 * `MockStore.overrideSelector`, qui ne peut viser une instance stable.
 */
export const selectHasPermission = (permission: string) =>
  createSelector(selectPermissions, (permissions) => permissions.includes(permission));
