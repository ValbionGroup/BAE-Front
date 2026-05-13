import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { ChartBar } from './models';

interface EncaissementsState {
  readonly loading: boolean;
  readonly data: readonly ChartBar[];
  readonly max: number;
}

export const EncaissementsStore = signalStore(
  { providedIn: 'root' },
  withState<EncaissementsState>({ loading: true, data: [], max: 1200 }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      setTimeout(() => {
        patchState(store, {
          loading: false,
          data: [
          ],
        });
      }, 1500);
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
