import { MemberModel, UserModel } from '#core/models/user.model';
import { ErrorModel } from '#core/models/error.model';

export interface AuthState {
  // Optional when not logged in
  user?: UserModel;
  member?: MemberModel;

  loginError?: ErrorModel;
}

// Root app state
export interface RootState {
  auth: AuthState;
}
