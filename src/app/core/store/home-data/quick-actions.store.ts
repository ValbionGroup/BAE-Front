import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  LucidePlus,
  LucideQrCode,
  LucideScanLine,
  LucideShoppingCart,
  LucideTicket,
  LucideUser,
} from '@lucide/angular';
import { QuickAction } from './models';

interface QuickActionsState {
  readonly loading: boolean;
  readonly data: readonly QuickAction[];
}

export const QuickActionsStore = signalStore(
  { providedIn: 'root' },
  withState<QuickActionsState>({ loading: true, data: [] }),
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
