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
      setTimeout(() => {
        patchState(store, {
          loading: false,
          data: [
            {
              icon: LucideTriangleAlert,
              title: 'Lot #L23-117 périmé',
              sub: 'Saucisses Strasbourg · 6 pièces · DLC 09/02',
              action: 'Retirer',
              bgClass: 'bg-danger-soft',
              fgClass: 'text-danger',
            },
            {
              icon: LucideClock,
              title: '2 réponses présence manquantes',
              sub: 'Soirée Hivernale · J-3 · relance auto activée',
              action: 'Relancer',
              bgClass: 'bg-warn-soft',
              fgClass: 'text-warn',
            },
            {
              icon: LucideTruck,
              title: 'Liste de courses prête',
              sub: '14 produits · 2 enseignes · ~218 €',
              action: 'Ouvrir',
              bgClass: 'bg-blue-soft',
              fgClass: 'text-blue',
            },
          ],
        });
      }, 800);
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
