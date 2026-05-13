import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { AgendaEvent } from './models';

interface AgendaState {
  readonly loading: boolean;
  readonly data: readonly AgendaEvent[];
}

export const AgendaStore = signalStore(
  { providedIn: 'root' },
  withState<AgendaState>({ loading: true, data: [] }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      setTimeout(() => {
        patchState(store, {
          loading: false,
          data: [
            {
              day: '14',
              month: 'fév',
              name: 'Soirée Hivernale',
              sub: 'Hot-dogs · Bières · Crêpes',
              status: 'Présente',
              statusKind: 'ok',
            },
            {
              day: '07',
              month: 'mar',
              name: 'Soirée Carnaval',
              sub: 'Tapas · Sangria',
              status: '—',
              statusKind: 'neutral',
            },
            {
              day: '28',
              month: 'mar',
              name: 'Repas Alternant·e·s',
              sub: 'Pâtes carbonara',
              status: 'Absente',
              statusKind: 'red',
            },
            {
              day: '12',
              month: 'avr',
              name: 'Soirée Printemps',
              sub: 'Burgers · Cocktails',
              status: '—',
              statusKind: 'neutral',
            },
          ],
        });
      }, 1200);
    },
    clear(): void {
      patchState(store, { loading: false, data: [] });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
