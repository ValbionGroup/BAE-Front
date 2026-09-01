import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { lastValueFrom } from 'rxjs';
import { formatCents } from '@bae/ui';
import {
  AnalyseService,
  type ApiSeasonAnalytics,
  type ApiSeasonOption,
  type ApiSeasonRef,
} from '#core/services/analyse/analyse-service';
import { LoadingStatus } from '#core/models/global.model';
import {
  AnalyseChartCol,
  AnalyseKpi,
  AnalysePrediction,
  AnalyseSoiree,
} from '#core/models/analyse.model';

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });

const money = (cents: number): string => `${formatCents(cents)} €`;

/** `—` et non `+0%` : une comparaison impossible n'est pas une stagnation. */
const signed = (value: number | null, suffix: string): string =>
  value === null ? '—' : `${value > 0 ? '+' : ''}${value}${suffix}`;

/** Un delta négatif affiché en vert dirait le contraire de ce qu'il vaut. */
const deltaClass = (value: number | null): string => {
  if (value === null || value === 0) return 'text-muted';
  return value > 0 ? 'text-ok' : 'text-warn';
};

interface AnalyseState {
  readonly loading: LoadingStatus;
  readonly loadError: string | null;
  readonly data: ApiSeasonAnalytics | null;
}

const initialState: AnalyseState = { loading: 'init', loadError: null, data: null };

export const AnalyseStore = signalStore(
  { providedIn: 'root' },
  withState<AnalyseState>(initialState),
  withComputed((store) => {
    const past = computed(() => (store.data()?.events ?? []).filter((e) => !e.upcoming));

    return {
      seasons: computed<readonly ApiSeasonOption[]>(() => store.data()?.seasons ?? []),
      season: computed<ApiSeasonRef | null>(() => store.data()?.season ?? null),

      kpis: computed<readonly AnalyseKpi[]>(() => {
        const data = store.data();
        if (!data) return [];
        const { kpis } = data;

        return [
          {
            label: 'Revenus saison',
            value: money(kpis.cashedCents),
            delta: signed(kpis.cashedDeltaPct, '% vs n-1'),
            deltaClass: deltaClass(kpis.cashedDeltaPct),
          },
          {
            label: 'Commandes/soirée (moy.)',
            value: String(kpis.avgOrdersPerEvent),
            delta: `σ ±${kpis.ordersStdDev}`,
            deltaClass: 'text-muted',
          },
          {
            label: 'Panier moyen',
            value: money(kpis.avgBasketCents),
            delta:
              kpis.avgBasketDeltaCents === null
                ? '—'
                : `${kpis.avgBasketDeltaCents > 0 ? '+' : '−'}${formatCents(Math.abs(kpis.avgBasketDeltaCents))} €`,
            deltaClass: deltaClass(kpis.avgBasketDeltaCents),
          },
          {
            label: 'Taux de présence',
            value: `${Math.round(kpis.presenceRate * 100)}%`,
            delta: signed(kpis.presenceDeltaPts, ' pts'),
            deltaClass: deltaClass(kpis.presenceDeltaPts),
          },
        ];
      }),

      chart: computed<readonly AnalyseChartCol[]>(() => {
        const data = store.data();
        if (!data) return [];

        const bars = past()
          .slice(-6)
          .map((event) => ({
            d: DATE_FMT.format(new Date(event.date)),
            cmd: event.orderCount,
            pred: false,
          }));

        const prediction = data.prediction;
        if (!prediction) return bars;

        const next = data.events.find((event) => event.id === prediction.eventId);
        return [
          ...bars,
          {
            d: next ? DATE_FMT.format(new Date(next.date)) : '—',
            cmd: prediction.expectedOrders,
            pred: true,
          },
        ];
      }),

      soirees: computed<readonly AnalyseSoiree[]>(() =>
        [...(store.data()?.events ?? [])].reverse().map((event) => ({
          id: event.id,
          n: event.name,
          d: DATE_FMT.format(new Date(event.date)),
          rev: event.upcoming ? '—' : money(event.cashedCents),
          cmd: event.upcoming ? '?' : event.orderCount,
          pred: event.upcoming,
          clickable: !event.upcoming,
          cashedCents: event.cashedCents,
          presentCount: event.presentCount,
          respondentCount: event.respondentCount,
        })),
      ),

      prediction: computed<AnalysePrediction | null>(() => {
        const prediction = store.data()?.prediction;
        if (!prediction) return null;

        return {
          label: `PRÉDICTION · ${prediction.eventName.toUpperCase()}`,
          description: `Moyenne des ${prediction.basedOnEventCount} dernières soirées, et ${prediction.preOrderCount} précommandes déjà enregistrées.`,
          expectedOrders: prediction.expectedOrders,
          range: prediction.range,
          estimatedRevenue: money(prediction.estimatedRevenueCents),
          prereg: prediction.preOrderCount,
        };
      }),
    };
  }),
  withMethods((store, svc = inject(AnalyseService)) => {
    async function fetch(startYear?: number): Promise<void> {
      patchState(store, { loading: 'loading', loadError: null });
      try {
        patchState(store, {
          loading: 'loaded',
          data: await lastValueFrom(svc.getSeason(startYear)),
        });
      } catch {
        patchState(store, {
          loading: 'error',
          loadError: 'Impossible de charger les analyses.',
          data: null,
        });
      }
    }

    return {
      async load(startYear?: number): Promise<void> {
        if (store.loading() === 'loaded' || store.loading() === 'loading') return;
        await fetch(startYear);
      },

      /** Contourne la garde de `load()` : changer de saison doit toujours refetch. */
      selectSeason(startYear: number): Promise<void> {
        return fetch(startYear);
      },

      clear(): void {
        patchState(store, initialState);
      },
    };
  }),
);
