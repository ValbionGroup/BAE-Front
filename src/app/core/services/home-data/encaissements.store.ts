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
            { label: 'Halloween', v1: 540, v2: 180, isNext: false },
            { label: 'Toussaint', v1: 280, v2: 120, isNext: false },
            { label: 'Hiver', v1: 720, v2: 240, isNext: false },
            { label: 'Noël', v1: 880, v2: 320, isNext: false },
            { label: 'Galette', v1: 460, v2: 180, isNext: false },
            { label: 'St-Val.', v1: 0, v2: 0, isNext: true },
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
