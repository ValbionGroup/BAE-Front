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

/**
 * L'API vient de refuser une requête de navigation ordinaire : la session est
 * morte alors qu'on la croyait vivante.
 *
 * ⚠️ Distinct de `rehydrationFailed`, qui dit « il n'y a jamais eu de session »
 * au démarrage. Ici il y en avait une, l'utilisateur était au travail, et la
 * destination en cours mérite d'être conservée pour l'après-reconnexion.
 */
export const sessionExpired = createAction('[Auth] Session Expired');

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
