import { createAction, props } from '@ngrx/store';
import { MemberModel, UserModel } from '#core/models/user.model';
import { ApiError } from '#core/models/api-response.model';

// Logout
export const logout = createAction('[Auth] Logout');

// Login
export const loginStart = createAction(
  '[Auth] Login Start',
  props<{ email: string; password: string }>(),
);

export const rehydrationFailed = createAction('[Auth] RehydrationFailed');

export const rehydrationSuccess = createAction(
  '[Auth] Rehydrate profile',
  props<{ user: UserModel; member: MemberModel; permissions: string[] }>(),
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: UserModel; member: MemberModel; permissions: string[] }>(),
);

export const loginFailure = createAction('[Auth] Login Failure', props<{ error: ApiError }>());

export const rehydrateAuth = createAction('[Auth] Rehydrate auth');
