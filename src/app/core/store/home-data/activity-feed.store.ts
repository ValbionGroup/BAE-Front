import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
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
      patchState(store, { loading: false });
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
);
