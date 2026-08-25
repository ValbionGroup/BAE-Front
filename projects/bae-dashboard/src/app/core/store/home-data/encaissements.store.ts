import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import {
  TransactionsService,
  type ApiTransaction,
} from '#core/services/transactions/transactions-service';
import { EventsStore } from '#core/store/events.store';
import type { LoadingStatus } from '#core/models/global.model';
import { ChartBar } from './models';

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
 * (`cash` | `lydia`). Mapping one onto the other would invent data, so `v1` is
 * the cash total and `v2` the Lydia total, and the template legend says so.
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

/** `v1` (espèces) et `v2` (Lydia) sont des totaux **en centimes**. */
interface EventBucket {
  readonly label: string;
  readonly time: number;
  readonly v1: number;
  readonly v2: number;
}

export const EncaissementsStore = signalStore(
  { providedIn: 'root' },
  withState<EncaissementsState>(initialState),
  withComputed((store) => {
    const events = inject(EventsStore);

    const buckets = computed<readonly EventBucket[]>(() => {
      const byEvent = new Map<string, { v1: number; v2: number }>();
      for (const tx of store.transactions()) {
        if (tx.eventId === null) continue;
        const key = String(tx.eventId);
        const bucket = byEvent.get(key) ?? { v1: 0, v2: 0 };
        if (tx.type === 'lydia') bucket.v2 += tx.amount;
        else bucket.v1 += tx.amount;
        byEvent.set(key, bucket);
      }

      const eventById = new Map(events.allEvents().map((e) => [String(e.id), e]));

      return [...byEvent.entries()]
        .map(([id, sums]) => {
          const event = eventById.get(id);
          return {
            label: event ? LABEL_FMT.format(event.date).replace('.', '') : `Soirée ${id}`,
            time: event ? event.date.getTime() : 0,
            v1: sums.v1,
            v2: sums.v2,
          };
        })
        .sort((a, b) => a.time - b.time);
    });

    const data = computed<readonly ChartBar[]>(() =>
      buckets()
        .slice(-store.limit())
        .map((b) => ({ label: b.label, v1: b.v1, v2: b.v2, isNext: false })),
    );

    return {
      loading: computed<boolean>(() => {
        const status = store.status();
        return status === 'init' || status === 'loading';
      }),
      data,
      /** Tallest single bar, floored at 1 so `pct()` never divides by zero. */
      max: computed<number>(() => Math.max(1, ...data().flatMap((b) => [b.v1, b.v2]))),
      total: computed<number>(() => data().reduce((sum, b) => sum + b.v1 + b.v2, 0)),
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
