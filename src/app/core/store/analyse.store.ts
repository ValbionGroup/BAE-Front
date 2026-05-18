import { computed, inject } from '@angular/core';
import { signalStore, withComputed, withState } from '@ngrx/signals';
import { EventsStore } from '#core/store/events.store';
import { LoadingStatus } from '#core/models/global.model';
import {
  AnalyseChartCol,
  AnalyseKpi,
  AnalysePrediction,
  AnalyseSoiree,
} from '#core/models/analyse.model';

const DATE_FMT = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit' });

export const AnalyseStore = signalStore(
  { providedIn: 'root' },
  withState({}),
  withComputed((_state, eventsStore = inject(EventsStore)) => ({
    loading: computed<LoadingStatus>(() => eventsStore.loading()),

    kpis: computed<readonly AnalyseKpi[]>(() => []),

    chart: computed<readonly AnalyseChartCol[]>(() => []),

    soirees: computed<readonly AnalyseSoiree[]>(() => {
      const now = Date.now();
      return [...eventsStore.allEvents()]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map((ev) => ({
          n: ev.name,
          d: DATE_FMT.format(ev.date),
          rev: '—',
          cmd: '—',
          pred: ev.date.getTime() > now,
        }));
    }),

    prediction: computed<AnalysePrediction | null>(() => null),
  })),
);
