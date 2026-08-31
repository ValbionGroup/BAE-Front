import { createAction, props } from '@ngrx/store';
import { MemberModel, TelegramLinkModel, UserModel } from '#core/models/user.model';
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

/**
 * La liaison Telegram a bougé sans que la session change. Ne touche qu'à elle :
 * réhydrater le profil entier pour un booléen ferait clignoter la page.
 */
export const telegramLinkChanged = createAction(
  '[Auth] Telegram Link Changed',
  props<{ telegram: TelegramLinkModel }>(),
);

export const rehydrateAuth = createAction('[Auth] Rehydrate auth');

export const sessionExpired = createAction('[Auth] Session Expired');

// Double authentification

export const twoFactorRequired = createAction('[Auth] Two Factor Required');

export const twoFactorVerifyStart = createAction(
  '[Auth] Two Factor Verify Start',
  props<{ code: string; kind: 'totp' | 'recovery' }>(),
);

export const twoFactorVerifyFailure = createAction(
  '[Auth] Two Factor Verify Failure',
  props<{ error: ApiError }>(),
);
