import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
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
      setTimeout(() => {
        patchState(store, {
          loading: false,
          data: [
          ],
        });
      }, 400);
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
