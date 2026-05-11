import { createReducer, on } from '@ngrx/store';
import { AuthState } from '#core/models/auth/auth-state.model';

import * as AuthActions from './auth.actions';

export const initialAuthState: AuthState = {};

export const authReducer = createReducer(
  initialAuthState,

  on(AuthActions.loginSuccess, (state, { user, member }) => ({
    ...state,
    user,
    member,
    alert: undefined,
    loginError: undefined,
  })),

  on(AuthActions.rehydrationSuccess, (state, { user, member }) => ({
    ...state,
    user,
    member,
    alert: undefined,
  })),

  on(AuthActions.loginFailure, (state, { error }) => ({
    ...state,
    user: undefined,
    loginError: error,
  })),

  on(AuthActions.rehydrationFailed, (state) => ({
    ...state,
    user: undefined,
    loginError: undefined,
  })),

  on(AuthActions.logout, () => initialAuthState),
);
