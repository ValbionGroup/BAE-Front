import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { NextEvent } from './models';

interface NextEventState {
  readonly loading: boolean;
  readonly data: NextEvent | null;
}

export const NextEventStore = signalStore(
  { providedIn: 'root' },
  withState<NextEventState>({ loading: true, data: null }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      setTimeout(() => {
        patchState(store, {
          loading: false,
          data: {
            name: 'Soirée Hivernale',
            date: 'Ven. 14 fév.',
            start: '19:30',
            days: 3,
            members: 18,
            prereg: 47,
            preparation: [
              { label: 'Recettes', value: '3/3', progress: 100, colorVar: 'var(--bae-ok)' },
              {
                label: 'Liste de courses',
                value: '12/14',
                progress: 86,
                colorVar: 'var(--bae-blue)',
              },
              {
                label: 'Postes affectés',
                value: '11/18',
                progress: 61,
                colorVar: 'var(--bae-warn)',
              },
              { label: 'Précommandes', value: '47', progress: null, colorVar: 'var(--bae-red)' },
            ],
          },
        });
      }, 900);
    },
    clear(): void {
      patchState(store, { loading: false, data: null });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
