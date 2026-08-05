import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { KpiTile } from './models';

interface StatsState {
  readonly loading: boolean;
  readonly data: readonly KpiTile[];
}

export const StatsStore = signalStore(
  { providedIn: 'root' },
  withState<StatsState>({ loading: true, data: [] }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      patchState(store, { loading: false });
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
);
