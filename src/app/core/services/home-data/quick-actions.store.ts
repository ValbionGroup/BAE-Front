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
            { label: 'Nouvelle commande', icon: LucideShoppingCart },
            { label: 'Scanner un produit', icon: LucideScanLine },
            { label: 'Encaisser Lydia', icon: LucideQrCode },
            { label: 'Vérifier adhérent', icon: LucideUser },
            { label: 'Ajouter au stock', icon: LucidePlus },
            { label: 'Ouvrir un ticket', icon: LucideTicket },
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
