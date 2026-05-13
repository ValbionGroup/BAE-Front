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
            {
              who: 'Maxime',
              what: 'a marqué le lot ',
              emphasis: '#L23-117',
              tail: ' périmé',
              when: 'il y a 4 min',
            },
            { who: 'Sarah', what: "a lancé l'algo de répartition", when: 'il y a 22 min' },
            {
              who: 'Tom',
              what: "a uploadé une preuve d'achat ",
              emphasis: 'Carrefour',
              when: '14:02',
            },
            {
              who: 'Inès',
              what: 'a ouvert le ticket ',
              emphasis: '#142',
              tail: ' « scan code-barres »',
              when: '11:48',
            },
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
