import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { inject } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { StocksService, type ApiStockItem } from '#core/services/stocks/stocks-service';
import type { LoadingStatus } from '#core/models/global.model';
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

interface StocksState {
  loading: LoadingStatus;
  loadError: string | null;
  products: StockProduct[];
}

const initialState: StocksState = {
  loading: 'init',
  loadError: null,
  products: [],
};

export const StocksStore = signalStore(
  { providedIn: 'root' },
  withState<StocksState>(initialState),
  withMethods((store, svc = inject(StocksService)) => ({
    async load(): Promise<void> {
      if (store.loading() === 'loaded' || store.loading() === 'loading') return;
      patchState(store, { loading: 'loading', loadError: null });
      try {
        const items = await lastValueFrom(svc.getAll());
        patchState(store, {
          loading: 'loaded',
          products: items.map(toStockProduct),
        });
      } catch {
        patchState(store, { loading: 'error', loadError: 'Impossible de charger les stocks.' });
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
