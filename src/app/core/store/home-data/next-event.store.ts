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
      patchState(store, { loading: false });
    },
    clear(): void {
      patchState(store, { loading: false, data: null });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
