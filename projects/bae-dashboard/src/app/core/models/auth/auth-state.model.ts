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
}

// Root app state
export interface RootState {
  auth: AuthState;
}
