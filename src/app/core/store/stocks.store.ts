import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { forkJoin, lastValueFrom } from 'rxjs';
import {
  StocksService,
  type ApiCategory,
  type ApiStockItem,
  type CreateGoodPayload,
} from '#core/services/stocks/stocks-service';
import type { LoadingStatus } from '#core/models/global.model';
import { messageOf, settle } from '#shared/utils/api-error';
import type { DlcStatus, StockBatchRow, StockProduct } from '#pages/authed/stocks/stocks.types';

function dlcStatus(expirationDate: string | null, today: Date): DlcStatus {
  if (!expirationDate) return 'none';
  const exp = new Date(expirationDate);
  const diffDays = (exp.getTime() - today.getTime()) / 86_400_000;
  if (diffDays < 0) return 'expired';
  if (diffDays <= 7) return 'soon';
  return 'ok';
}

function toStockProduct(item: ApiStockItem): StockProduct {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const nearestDlcStatus = dlcStatus(item.nearestExpirationDate, today);
  const nearestDlc = item.nearestExpirationDate
    ? new Date(item.nearestExpirationDate).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: '2-digit',
      })
    : null;

  return {
    id: item.id,
    name: item.name,
    unit: item.unit,
    brand: item.brand,
    categoryId: item.categoryId,
    categoryName: item.categoryName ?? '—',
    totalQty: item.totalRemainingQty,
    batchCount: item.batchCount,
    nearestDlc,
    nearestDlcStatus,
    expiredBatchCount: item.expiredBatchCount,
    soonBatchCount: item.soonBatchCount,
  };
}

/**
 * `GET /stocks` trie par nom et le tableau en dépend : un ajout en fin de liste
 * mettrait « Bière » après « Vaisselle » jusqu'au prochain rechargement.
 */
function insertByName(products: readonly StockProduct[], product: StockProduct): StockProduct[] {
  const index = products.findIndex((entry) => entry.name.localeCompare(product.name, 'fr') > 0);
  return index === -1
    ? [...products, product]
    : [...products.slice(0, index), product, ...products.slice(index)];
}

interface StocksState {
  loading: LoadingStatus;
  loadError: string | null;
  products: StockProduct[];
  /** Catégories du sélecteur de création. Vide si l'endpoint a échoué : ce
   *  n'est pas une raison de vider la page, seulement d'empêcher la saisie. */
  categories: ApiCategory[];
  creatingGood: boolean;
  createError: string | null;
}

const initialState: StocksState = {
  loading: 'init',
  loadError: null,
  products: [],
  categories: [],
  creatingGood: false,
  createError: null,
};

export const StocksStore = signalStore(
  { providedIn: 'root' },
  withState<StocksState>(initialState),
  withMethods((store, svc = inject(StocksService)) => ({
    async load(): Promise<void> {
      if (store.loading() === 'loaded' || store.loading() === 'loading') return;
      patchState(store, { loading: 'loading', loadError: null });
      try {
        // Les catégories ne servent qu'au formulaire : leur panne ne doit pas
        // emporter le tableau.
        const [items, categories] = await lastValueFrom(
          forkJoin([svc.getAll(), settle(svc.getCategories())]),
        );
        patchState(store, {
          loading: 'loaded',
          products: items.map(toStockProduct),
          categories: categories.ok ? categories.value : [],
        });
      } catch {
        patchState(store, { loading: 'error', loadError: 'Impossible de charger les stocks.' });
      }
    },

    /**
     * Non optimiste : pas d'id avant la réponse, et la liste est triée. Le
     * produit naît sans lot — c'est un réassort qui lui donnera du stock.
     */
    async createGood(payload: CreateGoodPayload): Promise<StockProduct | null> {
      if (store.creatingGood()) return null;
      patchState(store, { creatingGood: true, createError: null });

      try {
        const created = await lastValueFrom(svc.createGood(payload));
        const product: StockProduct = {
          id: created.id,
          name: created.name,
          unit: created.unit,
          brand: created.brand,
          categoryId: created.categoryId,
          categoryName: store.categories().find((c) => c.id === created.categoryId)?.name ?? '—',
          totalQty: 0,
          batchCount: 0,
          nearestDlc: null,
          nearestDlcStatus: 'none',
          expiredBatchCount: 0,
          soonBatchCount: 0,
        };
        patchState(store, { products: insertByName(store.products(), product) });
        // Rendu à l'appelant : le scanner en a besoin pour rattacher la ligne
        // qui vient d'être créée, qui sans cela resterait « à créer ».
        return product;
      } catch (error) {
        patchState(store, { createError: messageOf(error, 'Impossible de créer ce produit.') });
        return null;
      } finally {
        patchState(store, { creatingGood: false });
      }
    },

    /** Rechargement explicite : `load()` sortirait aussitôt, l'état étant
     *  déjà `loaded`. */
    async refresh(): Promise<void> {
      try {
        const [items, categories] = await lastValueFrom(
          forkJoin([svc.getAll(), settle(svc.getCategories())]),
        );
        patchState(store, {
          products: items.map(toStockProduct),
          categories: categories.ok ? categories.value : store.categories(),
        });
      } catch {
        patchState(store, { loadError: 'Impossible de recharger les stocks.' });
      }
    },

    async discardBatch(goodsId: number, batchId: number, remainingQty: number): Promise<void> {
      await lastValueFrom(svc.discardBatch(goodsId, batchId, remainingQty));
      const items = await lastValueFrom(svc.getAll());
      patchState(store, { products: items.map(toStockProduct) });
    },

    async getBatches(goodsId: number, showEmpty = false): Promise<StockBatchRow[]> {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const raw = await lastValueFrom(svc.getBatches(goodsId, showEmpty));
      return raw.map((b) => ({
        id: b.id,
        restockId: b.restockId,
        label: b.label,
        initialQty: b.initialQty,
        remainingQty: b.remainingQty,
        dlcLabel: b.expirationDate
          ? new Date(b.expirationDate).toLocaleDateString('fr-FR', {
              day: '2-digit',
              month: '2-digit',
              year: '2-digit',
            })
          : null,
        dlcStatus: dlcStatus(b.expirationDate, today),
        openedAt: b.openedAt
          ? new Date(b.openedAt).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
          : null,
      }));
    },
  })),
);
