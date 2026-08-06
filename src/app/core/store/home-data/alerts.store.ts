import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withState } from '@ngrx/signals';
import { LucideClock, LucideTriangleAlert, LucideTruck } from '@lucide/angular';
import { StocksStore } from '#core/store/stocks.store';
import type { StockProduct } from '#pages/authed/stocks/stocks.types';
import { AlertItem } from './models';

/**
 * "Alertes & rappels" panel.
 *
 * Derives only — it fetches nothing. The DLC buckets (`expiredBatchCount`,
 * `soonBatchCount`, `nearestDlcStatus`) are already computed by
 * `stocks.store.ts` from `/v1/stocks`; they are reused as-is, never recomputed.
 * `StocksStore.load()` is called by the page (`home.ts` · `ngOnInit`).
 */
const MAX_NAMES = 3;

function names(products: readonly StockProduct[]): string {
  const shown = products.slice(0, MAX_NAMES).map((p) => p.name);
  const rest = products.length - shown.length;
  return rest > 0 ? `${shown.join(', ')} +${rest}` : shown.join(', ');
}

function plural(count: number, singular: string, pluralForm: string): string {
  return count === 1 ? singular : pluralForm;
}

export const AlertsStore = signalStore(
  { providedIn: 'root' },
  withState({}),
  withComputed(() => {
    const stocks = inject(StocksStore);

    return {
      loading: computed<boolean>(() => {
        const status = stocks.loading();
        return status === 'init' || status === 'loading';
      }),

      error: computed<string | null>(() =>
        stocks.loading() === 'error' ? (stocks.loadError() ?? 'Stocks indisponibles.') : null,
      ),

      data: computed<readonly AlertItem[]>(() => {
        const products = stocks.products();
        const items: AlertItem[] = [];

        const expiredProducts = products.filter((p) => p.expiredBatchCount > 0);
        const expiredBatches = expiredProducts.reduce((s, p) => s + p.expiredBatchCount, 0);
        if (expiredBatches > 0) {
          items.push({
            icon: LucideTriangleAlert,
            title: `${expiredBatches} ${plural(expiredBatches, 'lot périmé', 'lots périmés')}`,
            sub: names(expiredProducts),
            action: 'Traiter',
            bgClass: 'bg-red-soft',
            fgClass: 'text-red',
          });
        }

        const soonProducts = products.filter((p) => p.soonBatchCount > 0);
        const soonBatches = soonProducts.reduce((s, p) => s + p.soonBatchCount, 0);
        if (soonBatches > 0) {
          items.push({
            icon: LucideClock,
            title: `${soonBatches} ${plural(soonBatches, 'lot proche', 'lots proches')} de la DLC`,
            sub: names(soonProducts),
            action: 'Voir',
            bgClass: 'bg-warn-soft',
            fgClass: 'text-warn',
          });
        }

        const emptyProducts = products.filter((p) => p.totalQty <= 0);
        if (emptyProducts.length > 0) {
          items.push({
            icon: LucideTruck,
            title: `${emptyProducts.length} ${plural(emptyProducts.length, 'produit épuisé', 'produits épuisés')}`,
            sub: names(emptyProducts),
            action: 'Réappro',
            bgClass: 'bg-blue-soft',
            fgClass: 'text-blue',
          });
        }

        return items;
      }),
    };
  }),
);
