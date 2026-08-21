import { createAction, props } from '@ngrx/store';
import { MemberModel, UserModel } from '#core/models/user.model';
import { ApiError } from '@bae/ui';

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
  props<{ user: UserModel; member: MemberModel | null; permissions: string[] }>(),
);

export const loginSuccess = createAction(
  '[Auth] Login Success',
  props<{ user: UserModel; member: MemberModel | null; permissions: string[] }>(),
);

export const loginFailure = createAction('[Auth] Login Failure', props<{ error: ApiError }>());

export const rehydrateAuth = createAction('[Auth] Rehydrate auth');

// Double authentification
/**
 * Le mot de passe était bon, mais il ne suffit pas. Aucune session n'est ouverte :
 * le serveur a posé un cookie de défi, court et `httpOnly`, et attend un code.
 *
 * ⚠️ Ce n'est **pas** un échec de connexion. Le distinguer de `loginFailure` est
 * tout l'intérêt de l'action : sans elle, la page de connexion afficherait
 * « Identifiants incorrects. » sur un mot de passe correct.
 */
export const twoFactorRequired = createAction('[Auth] Two Factor Required');

export const twoFactorVerifyStart = createAction(
  '[Auth] Two Factor Verify Start',
  props<{ code: string; kind: 'totp' | 'recovery' }>(),
);

export const twoFactorVerifyFailure = createAction(
  '[Auth] Two Factor Verify Failure',
  props<{ error: ApiError }>(),
);
