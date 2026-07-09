import { MemberModel, UserModel } from '#core/models/user.model';
import { ApiError } from '#core/models/api-response.model';

export interface AuthState {
  // Optional when not logged in
  user?: UserModel;
  member?: MemberModel;

  loginError?: ApiError;
}

// Root app state
export interface RootState {
  auth: AuthState;
}
