import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { AgendaEvent } from './models';

interface AgendaState {
  readonly loading: boolean;
  readonly data: readonly AgendaEvent[];
}

export const AgendaStore = signalStore(
  { providedIn: 'root' },
  withState<AgendaState>({ loading: true, data: [] }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      patchState(store, { loading: false });
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
