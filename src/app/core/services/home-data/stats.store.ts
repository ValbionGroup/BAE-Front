import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
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
      setTimeout(() => {
        patchState(store, {
          loading: false,
          data: [
            { label: 'Encaissé (cumul.)', value: '4 218 €', delta: '+12%', positive: true },
            { label: 'Adhérents actifs', value: '142', delta: '+4', positive: true },
            { label: 'Stocks valorisés', value: '1 880 €', delta: '−6%', positive: false },
          ],
        });
      }, 600);
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
