import { createFeatureSelector, createSelector } from '@ngrx/store';
import { AuthState } from '#core/models/auth/auth-state.model';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUser = createSelector(selectAuthState, (state: AuthState) => state.user);

export const selectMember = createSelector(selectAuthState, (state: AuthState) => state.member);

export const selectLoginError = createSelector(
  selectAuthState,
  (state: AuthState) => state.loginError,
);

export const selectPermissions = createSelector(
  selectAuthState,
  (state: AuthState) => state.permissions ?? [],
);

/**
 * Le front n'évite que les impasses : ce sélecteur masque ce que le back
 * refuserait, il n'autorise rien. Toute décision reste au serveur.
 *
 * Réservé aux gardes de route. Un composant doit lire `selectPermissions` et
 * dériver : cette fabrique construit un sélecteur NEUF à chaque appel, donc
 * `MockStore.overrideSelector` ne peut jamais viser l'instance créée dans le
 * composant, et le test ne pilote rien.
 */
export const selectHasPermission = (permission: string) =>
  createSelector(selectPermissions, (permissions) => permissions.includes(permission));
