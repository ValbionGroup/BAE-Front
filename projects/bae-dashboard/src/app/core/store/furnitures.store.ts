import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import type { LoadingStatus } from '#core/models/global.model';
import {
  FurnituresService,
  type ApiFurniture,
  type FurnitureInput,
} from '#core/services/furnitures/furnitures-service';
import type { WriteResult } from '#core/store/referentiels.store';

interface FurnituresState {
  readonly loading: LoadingStatus;
  readonly loadError: string | null;
  readonly items: readonly ApiFurniture[];
}

const initialState: FurnituresState = {
  loading: 'init',
  loadError: null,
  items: [],
};

/** `GET /furnitures` sert un `Furniture.all()`, donc l'ordre de la clé primaire.
 *  Le tableau, lui, se lit par nom. */
function byName(items: readonly ApiFurniture[]): ApiFurniture[] {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
}

/**
 * Le catalogue **non alimentaire**, partagé par la page Stocks et la modale de
 * recette — deux écrans, une seule liste, comme `StocksStore` l'est déjà pour
 * les denrées.
 */
export const FurnituresStore = signalStore(
  { providedIn: 'root' },
  withState<FurnituresState>(initialState),
  withMethods((store, svc = inject(FurnituresService)) => {
    async function reload(): Promise<void> {
      const items = await lastValueFrom(svc.getAll());
      patchState(store, { items: byName(items), loading: 'loaded', loadError: null });
    }

    /**
     * Une écriture aboutie **relit la liste** au lieu de la rejouer localement :
     * elle est courte, non paginée, et le tri par nom se referait de toute
     * façon après un renommage.
     *
     * Un échec ne recharge rien et rend l'erreur : les refus du serveur portent
     * une phrase française que l'écran doit montrer.
     */
    async function write(action: () => Promise<unknown>): Promise<WriteResult> {
      try {
        await action();
        await reload();
        return { ok: true };
      } catch (error) {
        return { ok: false, error };
      }
    }

    return {
      /** Gardé : la modale de recette et la page Stocks l'appellent toutes deux. */
      async load(): Promise<void> {
        if (store.loading() === 'loaded' || store.loading() === 'loading') return;
        patchState(store, { loading: 'loading', loadError: null });
        try {
          await reload();
        } catch {
          patchState(store, {
            loading: 'error',
            loadError: 'Impossible de charger les fournitures.',
          });
        }
      },

      create: (input: FurnitureInput) => write(() => lastValueFrom(svc.create(input))),
      update: (id: number, input: FurnitureInput) =>
        write(() => lastValueFrom(svc.update(id, input))),
      remove: (id: number) => write(() => lastValueFrom(svc.remove(id))),
    };
  }),
);
