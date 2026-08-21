import { MemberModel, UserModel } from '#core/models/user.model';
import { ApiError } from '@bae/ui';

export interface AuthState {
  // Optional when not logged in
  user?: UserModel;
  /** `null` — et non `undefined` — quand le profil a répondu sans membre rattaché. */
  member?: MemberModel | null;
  /** Absent tant que le profil n'a pas répondu ; jamais confondu avec « aucun droit ». */
  permissions?: string[];

  loginError?: ApiError;

  /**
   * Un défi 2FA est en cours : le mot de passe était bon, le second facteur
   * manque. Le défi lui-même vit dans un cookie `httpOnly` — ce drapeau n'en est
   * que l'écho local, et ne fait donc autorité que le temps d'une navigation.
   * C'est `twoFactorChallengeGuard` qui interroge l'API après un rafraîchissement.
   */
  twoFactorPending?: boolean;
  /** Le refus du dernier code présenté, distinct de `loginError`. */
  twoFactorError?: ApiError;
}

// Root app state
export interface RootState {
  auth: AuthState;
}
