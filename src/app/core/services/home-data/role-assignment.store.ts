import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { LucideShoppingCart } from '@lucide/angular';
import { RoleAssignment } from './models';

interface RoleAssignmentState {
  readonly loading: boolean;
  readonly data: RoleAssignment | null;
}

export const RoleAssignmentStore = signalStore(
  { providedIn: 'root' },
  withState<RoleAssignmentState>({ loading: true, data: null }),
  withMethods((store) => ({
    load(): void {
      patchState(store, { loading: true });
      setTimeout(() => {
        patchState(store, {
          loading: false,
          data: {
            poste: 'Caisse · zone B',
            icon: LucideShoppingCart,
            algoScore: 92,
            meta: [
              { label: 'Service', value: '19:30 — 22:00' },
              { label: 'Pause', value: '20:45 (15 min)' },
              { label: 'Co-équipier', value: 'Tom Bessière' },
              { label: 'Coordo', value: 'Sarah K.' },
            ],
          },
        });
      }, 1000);
    },
    clear(): void {
      patchState(store, { loading: false, data: null });
    },
  })),
  withHooks({ onInit: (s) => s.load() }),
);
