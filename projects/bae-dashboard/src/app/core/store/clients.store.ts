import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { forkJoin, lastValueFrom } from 'rxjs';
import {
  ClientsService,
  type SubscriptionWritePayload,
} from '#core/services/clients/clients-service';
import type { LoadingStatus } from '#core/models/global.model';
import { messageOf } from '#shared/utils/api-error';
import type {
  ClientDetail,
  ClientRow,
  ClientWritePayload,
  ClientsSummary,
} from '#pages/authed/adherents/adherents.types';

interface ClientsState {
  loading: LoadingStatus;
  loadError: string | null;
  clients: ClientRow[];
  summary: ClientsSummary | null;
  saving: boolean;
  saveError: string | null;
}

const initialState: ClientsState = {
  loading: 'init',
  loadError: null,
  clients: [],
  summary: null,
  saving: false,
  saveError: null,
};

export const ClientsStore = signalStore(
  { providedIn: 'root' },
  withState<ClientsState>(initialState),
  withMethods((store) => {
    const svc = inject(ClientsService);

    /**
     * Liste et compteurs sont rechargés **ensemble** : les tuiles du bandeau
     * annoncent le nombre de lignes de chaque onglet, et les rafraîchir
     * séparément laisserait l'un des deux en retard après une écriture.
     */
    async function reload(): Promise<void> {
      const { clients, summary } = await lastValueFrom(
        forkJoin({ clients: svc.getAll(), summary: svc.getSummary() }),
      );
      patchState(store, { clients, summary });
    }

    return {
      async load(): Promise<void> {
        if (store.loading() === 'loaded' || store.loading() === 'loading') return;
        patchState(store, { loading: 'loading', loadError: null });
        try {
          await reload();
          patchState(store, { loading: 'loaded' });
        } catch {
          patchState(store, {
            loading: 'error',
            loadError: 'Impossible de charger les adhérents.',
          });
        }
      },

      /** `load()` sortirait aussitôt, l'état étant déjà `loaded`. */
      async refresh(): Promise<void> {
        try {
          await reload();
        } catch {
          patchState(store, { loadError: 'Impossible de recharger les adhérents.' });
        }
      },

      async getDetail(id: number): Promise<ClientDetail | null> {
        try {
          return await lastValueFrom(svc.getOne(id));
        } catch {
          return null;
        }
      },

      async updateClient(id: number, payload: ClientWritePayload): Promise<boolean> {
        if (store.saving()) return false;
        patchState(store, { saving: true, saveError: null });
        try {
          await lastValueFrom(svc.update(id, payload));
          await reload();
          return true;
        } catch (error) {
          patchState(store, {
            saveError: messageOf(error, 'Impossible d’enregistrer cette fiche.'),
          });
          return false;
        } finally {
          patchState(store, { saving: false });
        }
      },

      /** Renouveler ajoute une ligne d'historique, jamais n'en modifie une. */
      async subscribe(payload: SubscriptionWritePayload): Promise<boolean> {
        if (store.saving()) return false;
        patchState(store, { saving: true, saveError: null });
        try {
          await lastValueFrom(svc.subscribe(payload));
          await reload();
          return true;
        } catch (error) {
          patchState(store, {
            saveError: messageOf(error, 'Impossible d’enregistrer cette cotisation.'),
          });
          return false;
        } finally {
          patchState(store, { saving: false });
        }
      },

      clearSaveError(): void {
        patchState(store, { saveError: null });
      },
    };
  }),
);
