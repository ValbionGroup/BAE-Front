import {provideStore} from '@ngrx/store';
import {authReducer, initialAuthState} from '#core/store/auth/auth.reducer';

export const storeConfig = provideStore({
  auth: authReducer
});

export const initialMockState = {
  auth: initialAuthState
};
