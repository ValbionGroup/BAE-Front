import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { LoadingStatus } from '#core/models/global.model';
import {
  ReferentielsService,
  type ApiCategory,
  type ApiJob,
  type ApiProductCategory,
  type ApiStorageLocation,
  type ApiSupplier,
  type JobInput,
} from '#core/services/referentiels/referentiels-service';

/**
 * Même forme, et pour la même raison, que `PresenceUpdateResult` et
 * `EventStatusResult` : les refus de suppression (`E_SUPPLIER_IN_USE`,
 * `E_JOB_IN_USE`, `E_JOB_SETTLED`) portent une phrase française que l'écran
 * doit montrer. Une promesse rejetée que personne n'attend est une erreur
 * avalée, et l'opérateur conclut à une panne devant un bouton inerte.
 */
export type WriteResult = { ok: true } | { ok: false; error: unknown };

interface ReferentielsState {
  readonly loading: LoadingStatus;
  readonly loadError: string | null;
  readonly categories: readonly ApiCategory[];
  readonly suppliers: readonly ApiSupplier[];
  readonly jobs: readonly ApiJob[];
  readonly productCategories: readonly ApiProductCategory[];
  readonly storageLocations: readonly ApiStorageLocation[];
}

const initialState: ReferentielsState = {
  loading: 'init',
  loadError: null,
  categories: [],
  suppliers: [],
  jobs: [],
  productCategories: [],
  storageLocations: [],
};

export const ReferentielsStore = signalStore(
  { providedIn: 'root' },
  withState<ReferentielsState>(initialState),
  withMethods((store, svc = inject(ReferentielsService)) => {
    async function reload(): Promise<void> {
      const data = await lastValueFrom(svc.loadAll());
      patchState(store, { ...data, loading: 'loaded', loadError: null });
    }

    /**
     * ⚠️ Une écriture aboutie **relit les trois listes** et ne touche rien
     * localement. Les compteurs d'usage (`goodsCount`, `voucherCount`) sont
     * calculés par le serveur ; les rejouer ici les ferait diverger à la
     * première subtilité — une denrée déclassée par une suppression de
     * catégorie, par exemple.
     *
     * Un échec ne recharge rien : il n'y a rien de nouveau à lire.
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
      async load(): Promise<void> {
        patchState(store, {
          loading: store.loading() === 'loaded' ? 'refreshing' : 'loading',
          loadError: null,
        });
        try {
          await reload();
        } catch {
          patchState(store, {
            loading: 'error',
            loadError: 'Impossible de charger les listes de référence.',
          });
        }
      },

      createCategory: (name: string) => write(() => lastValueFrom(svc.createCategory(name))),
      updateCategory: (id: number, name: string) =>
        write(() => lastValueFrom(svc.updateCategory(id, name))),
      deleteCategory: (id: number) => write(() => lastValueFrom(svc.deleteCategory(id))),

      createSupplier: (name: string) => write(() => lastValueFrom(svc.createSupplier(name))),
      updateSupplier: (id: number, name: string) =>
        write(() => lastValueFrom(svc.updateSupplier(id, name))),
      deleteSupplier: (id: number) => write(() => lastValueFrom(svc.deleteSupplier(id))),

      createProductCategory: (name: string) =>
        write(() => lastValueFrom(svc.createProductCategory(name))),
      updateProductCategory: (id: number, name: string) =>
        write(() => lastValueFrom(svc.updateProductCategory(id, name))),
      deleteProductCategory: (id: number) =>
        write(() => lastValueFrom(svc.deleteProductCategory(id))),

      createStorageLocation: (name: string) =>
        write(() => lastValueFrom(svc.createStorageLocation(name))),
      updateStorageLocation: (id: number, name: string) =>
        write(() => lastValueFrom(svc.updateStorageLocation(id, name))),
      deleteStorageLocation: (id: number) =>
        write(() => lastValueFrom(svc.deleteStorageLocation(id))),

      createJob: (input: JobInput) => write(() => lastValueFrom(svc.createJob(input))),
      updateJob: (id: number, input: JobInput) =>
        write(() => lastValueFrom(svc.updateJob(id, input))),
      deleteJob: (id: number) => write(() => lastValueFrom(svc.deleteJob(id))),
    };
  }),
);
