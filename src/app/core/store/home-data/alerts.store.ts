import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { LucideClock, LucideTriangleAlert, LucideTruck } from '@lucide/angular';
import { AlertItem } from './models';

interface AlertsState {
  readonly loading: boolean;
  readonly data: readonly AlertItem[];
}

export const AlertsStore = signalStore(
  { providedIn: 'root' },
  withState<AlertsState>({ loading: true, data: [] }),
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
