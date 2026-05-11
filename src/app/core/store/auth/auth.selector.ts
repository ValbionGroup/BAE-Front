import { createFeatureSelector, createSelector } from '@ngrx/store';
import {AuthState} from '#core/models/auth/auth-state.model';

export const selectAuthState = createFeatureSelector<AuthState>('auth');

export const selectUser = createSelector(selectAuthState, (state: AuthState) => state.user);

export const selectMember = createSelector(selectAuthState, (state: AuthState) => state.member);

export const selectLoginError = createSelector(
  selectAuthState,
  (state: AuthState) => state.loginError
);
