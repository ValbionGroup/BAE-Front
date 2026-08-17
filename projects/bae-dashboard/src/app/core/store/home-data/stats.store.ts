import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withState } from '@ngrx/signals';
import { startOfDay } from 'date-fns';
import { EventsStore } from '#core/store/events.store';
import { StocksStore } from '#core/store/stocks.store';
import { KpiTile } from './models';

/**
 * KPI strip of the home header.
 *
 * Derives only — it fetches nothing. `EventsStore.load()` and
 * `StocksStore.load()` are called by the page (`home.ts` · `ngOnInit`).
 *
 * ⚠️ `KpiTile.delta` / `KpiTile.positive` come from the mockup and imply a
 * period-over-period comparison. No endpoint returns a previous-period value
 * (neither `/v1/events` nor `/v1/stocks` are time-sliced), so `delta` is left
 * empty — the template then renders an empty span, i.e. a neutral tile — and
 * `positive` is pinned to `true` so it never colours anything.
 */
const NO_DELTA = { delta: '', positive: true } as const;

export const StatsStore = signalStore(
  { providedIn: 'root' },
  withState({}),
  withComputed(() => {
    const events = inject(EventsStore);
    const stocks = inject(StocksStore);

    return {
      loading: computed<boolean>(() => {
        const ev = events.loading();
        const st = stocks.loading();
        return ev === 'init' || ev === 'loading' || st === 'init' || st === 'loading';
      }),

      error: computed<string | null>(() => {
        if (stocks.loading() === 'error') return stocks.loadError() ?? 'Stocks indisponibles.';
        if (events.loading() === 'error') return 'Soirées indisponibles.';
        return null;
      }),

      data: computed<readonly KpiTile[]>(() => {
        const today = startOfDay(new Date()).getTime();
        const upcoming = events.allEvents().filter((e) => e.date.getTime() >= today).length;

        const products = stocks.products();
        const inStock = products.filter((p) => p.totalQty > 0).length;
        const watched = products.reduce(
          (sum, p) => sum + p.expiredBatchCount + p.soonBatchCount,
          0,
        );

        return [
          { label: 'Soirées à venir', value: String(upcoming), ...NO_DELTA },
          { label: 'Produits en stock', value: String(inStock), ...NO_DELTA },
          { label: 'Lots à surveiller', value: String(watched), ...NO_DELTA },
        ];
      }),
    };
  }),
);
