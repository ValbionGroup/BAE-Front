import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import {
  LucidePlus,
  LucideQrCode,
  LucideScanLine,
  LucideShoppingCart,
  LucideTicket,
  LucideUser,
} from '@lucide/angular';
import { AppRoutes } from '#app/app-routes.const';
import { QuickAction } from './models';

/**
 * "Accès rapides" tiles.
 *
 * Genuinely static: these are navigation shortcuts, not data. No endpoint is
 * involved and none should be — the list is a product decision.
 *
 * `QuickAction` (in `models.ts`) carries no route field, so the destination
 * lives in `QUICK_ACTION_ROUTES` next to the list and `home.ts` looks it up by
 * label when a tile is clicked.
 */
const ACTIONS: readonly QuickAction[] = [
  { label: 'Nouvelle soirée', icon: LucidePlus },
  { label: 'Scanner un produit', icon: LucideScanLine },
  { label: 'Ouvrir la caisse', icon: LucideShoppingCart },
  { label: 'Précommandes', icon: LucideQrCode },
  { label: 'Tickets', icon: LucideTicket },
  { label: 'Adhérents', icon: LucideUser },
];

export const QUICK_ACTION_ROUTES: Readonly<Record<string, string>> = {
  'Nouvelle soirée': AppRoutes.coordination,
  'Scanner un produit': AppRoutes.stocksScanner,
  'Ouvrir la caisse': AppRoutes.caisse,
  Précommandes: AppRoutes.precommandesAdmin,
  Tickets: AppRoutes.tickets,
  Adhérents: AppRoutes.adherents,
};

interface QuickActionsState {
  readonly loading: boolean;
  readonly data: readonly QuickAction[];
}

const initialState: QuickActionsState = { loading: true, data: [] };

export const QuickActionsStore = signalStore(
  { providedIn: 'root' },
  withState<QuickActionsState>(initialState),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: false, data: ACTIONS });
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
);
