import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { ActivityItem } from './models';

interface ActivityFeedState {
  readonly loading: boolean;
  readonly data: readonly ActivityItem[];
}

export const ActivityFeedStore = signalStore(
  { providedIn: 'root' },
  withState<ActivityFeedState>({ loading: true, data: [] }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      setTimeout(() => {
        patchState(store, {
          loading: false,
          data: [
          ],
        });
      }, 1100);
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
