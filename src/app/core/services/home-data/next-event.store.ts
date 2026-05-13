import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { NextEvent } from './models';

interface NextEventState {
  readonly loading: boolean;
  readonly data: NextEvent | null;
}

export const NextEventStore = signalStore(
  { providedIn: 'root' },
  withState<NextEventState>({ loading: true, data: null }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      // Events are created from the Coordination module, not from the home page.
      // When none exist yet, the API returns null and the page renders the empty state.
      setTimeout(() => {
        patchState(store, { loading: false, data: null });
      }, 900);
    },
    clear(): void {
      patchState(store, { loading: false, data: null });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
