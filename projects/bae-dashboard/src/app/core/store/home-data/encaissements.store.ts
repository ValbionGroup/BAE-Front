import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import {
  TransactionsService,
  type ApiTransaction,
  type TransactionType,
} from '#core/services/transactions/transactions-service';
import { EventsStore } from '#core/store/events.store';
import type { LoadingStatus } from '#core/models/global.model';
import { CHART_SERIES, type ChartBar } from './models';

/**
 * "Encaissements" chart.
 *
 * Source: `GET /v1/transactions` (most recent first), grouped by the event the
 * transaction settles. Event labels come from `EventsStore` (already loaded by
 * the page); a transaction whose order carries no event has nothing to sit
 * under and is left out of the chart.
 *
 * ⚠️ The mockup legend read "Caisse sur place" vs "Précommandes". The API has
 * no such channel split: `transactions.type` is a *payment method*
 * (`cash` | `lydia` | `card`). Mapping one onto the other would invent data, so
 * each bar is split by payment method and the legend says so.
 *
 * ⚠️ `ChartBar.isNext` drives the dashed "(est.)" projection bar. There is no
 * forecasting endpoint, so it is always `false` — the chart shows recorded
 * takings only.
 */
const LABEL_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short' });

/** Number of soirées charted, driven by the 1A/3A/6A/12A selector. */
const DEFAULT_LIMIT = 6;

interface EncaissementsState {
  readonly status: LoadingStatus;
  readonly error: string | null;
  readonly transactions: readonly ApiTransaction[];
  readonly limit: number;
}

const initialState: EncaissementsState = {
  status: 'init',
  error: null,
  transactions: [],
  limit: DEFAULT_LIMIT,
};

/** Un total **en centimes** par moyen de paiement. */
type MethodTotals = Record<TransactionType, number>;

interface EventBucket {
  readonly label: string;
  readonly time: number;
  readonly totals: MethodTotals;
}

function emptyTotals(): MethodTotals {
  return { cash: 0, lydia: 0, card: 0 };
}

export const EncaissementsStore = signalStore(
  { providedIn: 'root' },
  withState<EncaissementsState>(initialState),
  withComputed((store) => {
    const events = inject(EventsStore);

    const buckets = computed<readonly EventBucket[]>(() => {
      const byEvent = new Map<string, MethodTotals>();
      for (const tx of store.transactions()) {
        if (tx.eventId === null) continue;
        const key = String(tx.eventId);
        const totals = byEvent.get(key) ?? emptyTotals();
        totals[tx.type] += tx.amount;
        byEvent.set(key, totals);
      }

      const eventById = new Map(events.allEvents().map((e) => [String(e.id), e]));

      return [...byEvent.entries()]
        .map(([id, totals]) => {
          const event = eventById.get(id);
          return {
            label: event ? LABEL_FMT.format(event.date).replace('.', '') : `Soirée ${id}`,
            time: event ? event.date.getTime() : 0,
            totals,
          };
        })
        .sort((a, b) => a.time - b.time);
    });

    const data = computed<readonly ChartBar[]>(() =>
      buckets()
        .slice(-store.limit())
        .map((b) => ({
          label: b.label,
          slices: CHART_SERIES.map((serie) => ({ ...serie, amount: b.totals[serie.method] })),
          isNext: false,
        })),
    );

    return {
      loading: computed<boolean>(() => {
        const status = store.status();
        return status === 'init' || status === 'loading';
      }),
      data,
      /** Tallest single bar, floored at 1 so `pct()` never divides by zero. */
      max: computed<number>(() =>
        Math.max(1, ...data().flatMap((b) => b.slices.map((s) => s.amount))),
      ),
      /** Somme de tout ce qui est encaissé sur la période, **en centimes**. */
      total: computed<number>(() =>
        data().reduce((sum, b) => sum + b.slices.reduce((acc, s) => acc + s.amount, 0), 0),
      ),
    };
  }),
  withMethods((store, svc = inject(TransactionsService)) => ({
    async load(): Promise<void> {
      if (store.status() === 'loaded' || store.status() === 'loading') return;
      patchState(store, { status: 'loading', error: null });
      try {
        const transactions = await lastValueFrom(svc.getAll());
        patchState(store, { status: 'loaded', transactions });
      } catch {
        patchState(store, {
          status: 'error',
          error: 'Impossible de charger les encaissements.',
          transactions: [],
        });
      }
    },

    /** Number of past soirées charted (1A/3A/6A/12A selector). */
    setLimit(limit: number): void {
      patchState(store, { limit: Math.max(1, limit) });
    },

    clear(): void {
      patchState(store, initialState);
    },
  })),
);
