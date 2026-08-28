import { createReducer, on } from '@ngrx/store';
import { AuthState } from '#core/models/auth/auth-state.model';

import * as AuthActions from './auth.actions';

export const initialAuthState: AuthState = {};

export const authReducer = createReducer(
  initialAuthState,

  on(AuthActions.loginSuccess, (state, { user, member, permissions }) => ({
    ...state,
    user,
    member,
    permissions,
    alert: undefined,
    loginError: undefined,
    twoFactorPending: undefined,
    twoFactorError: undefined,
  })),

  on(AuthActions.rehydrationSuccess, (state, { user, member, permissions }) => ({
    ...state,
    user,
    member,
    permissions,
    alert: undefined,
  })),

  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    user: undefined,
    member: undefined,
    // `[]`, pas `undefined` : le garde de permission attend que le profil se
    // règle avant de décider, et un array réglé « sans rien » le débloque.
    permissions: [],
    loginError: error,
  })),

  on(AuthActions.rehydrationFailed, (state) => ({
    ...state,
    user: undefined,
    member: undefined,
    permissions: [],
    loginError: undefined,
  })),

  /**
   * ⚠️ Ne touche **ni** `user` **ni** `permissions`, contrairement à
   * `loginFailure`. Celui-ci pose `permissions: []` pour débloquer les gardes qui
   * attendent que le profil se règle ; ici il l'est déjà, depuis la réhydratation
   * au démarrage, et le réécrire ne serait que du bruit.
   *
   * En revanche `loginError` doit être effacé : sinon la page de connexion peint
   * une alerte rouge à l'instant même où on la quitte pour l'écran du code.
   */
  on(AuthActions.twoFactorRequired, (state) => ({
    ...state,
    twoFactorPending: true,
    twoFactorError: undefined,
    loginError: undefined,
  })),

  on(AuthActions.twoFactorVerifyFailure, (state, { error }) => ({
    ...state,
    twoFactorError: error,
  })),

  /**
   * ⚠️ Surtout **pas** `initialAuthState`, malgré la ressemblance avec une
   * déconnexion : `authGuard` n'accepte de trancher que sur un `permissions`
   * défini (`isSettled`). Le remettre à `undefined` le laisserait attendre pour
   * toujours, sur une page blanche — au lieu de rebondir vers la connexion, qui
   * est tout l'objet de l'action.
   */
  on(AuthActions.sessionExpired, (state) => ({
    ...state,
    user: undefined,
    member: undefined,
    permissions: [],
  })),

  on(AuthActions.logout, () => initialAuthState),
);
