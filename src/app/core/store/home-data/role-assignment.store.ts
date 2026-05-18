import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { RoleAssignment } from './models';

interface RoleAssignmentState {
  readonly loading: boolean;
  readonly data: RoleAssignment | null;
}

export const RoleAssignmentStore = signalStore(
  { providedIn: 'root' },
  withState<RoleAssignmentState>({ loading: true, data: null }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      patchState(store, { loading: false });
    },
    clear(): void {
      patchState(store, { loading: false, data: null });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
