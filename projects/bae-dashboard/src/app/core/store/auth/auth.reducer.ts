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

  on(AuthActions.logout, () => initialAuthState),
);
