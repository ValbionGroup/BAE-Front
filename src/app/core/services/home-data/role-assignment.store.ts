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
      // A role is only assigned once a future event exists. With no upcoming
      // event, the API returns null and the page renders the empty state.
      setTimeout(() => {
        patchState(store, { loading: false, data: null });
      }, 1000);
    },
    clear(): void {
      patchState(store, { loading: false, data: null });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
