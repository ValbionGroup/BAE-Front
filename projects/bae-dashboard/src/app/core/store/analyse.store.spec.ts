import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import type { ApiSeasonAnalytics } from '#core/services/analyse/analyse-service';

import { AnalyseStore } from './analyse.store';

const PAYLOAD: ApiSeasonAnalytics = {
  season: { startYear: 2025, label: 'Saison 2025-2026' },
  seasons: [
    { startYear: 2025, label: 'Saison 2025-2026', eventCount: 2 },
    { startYear: 2024, label: 'Saison 2024-2025', eventCount: 5 },
  ],
  kpis: {
    cashedCents: 790000,
    cashedDeltaPct: 18,
    avgOrdersPerEvent: 285,
    ordersStdDev: 48,
    avgBasketCents: 580,
    avgBasketDeltaCents: 40,
    presenceRate: 0.92,
    presenceDeltaPts: -3,
  },
  events: [
    {
      id: 10,
      name: 'Rentrée 2025',
      date: '2025-09-20T20:00:00.000+00:00',
      orderCount: 318,
      cashedCents: 172000,
      presentCount: 22,
      respondentCount: 24,
      upcoming: false,
    },
    {
      id: 11,
      name: 'Hivernale 2026',
      date: '2026-02-14T20:00:00.000+00:00',
      orderCount: 0,
      cashedCents: 0,
      presentCount: 0,
      respondentCount: 0,
      upcoming: true,
    },
  ],
  prediction: {
    eventId: 11,
    eventName: 'Hivernale 2026',
    expectedOrders: 290,
    range: 48,
    estimatedRevenueCents: 168200,
    preOrderCount: 47,
    basedOnEventCount: 6,
  },
};

describe(AnalyseStore.name, () => {
  let store: InstanceType<typeof AnalyseStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(AnalyseStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  async function load(payload: ApiSeasonAnalytics = PAYLOAD): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne((r) => r.url === `${baseUrl}/analytics/season`).flush(payload);
    await loaded;
  }

  it('part vide, sans diviser par zéro', () => {
    expect(store.loading()).toBe('init');
    expect(store.kpis()).toEqual([]);
    expect(store.prediction()).toBeNull();
  });

  it('rend quatre KPI formatés en euros', async () => {
    await load();

    const kpis = store.kpis();
    expect(kpis.length).toBe(4);
    expect(kpis[0].value).toBe('7900,00 €');
    expect(kpis[0].delta).toBe('+18% vs n-1');
    expect(kpis[2].value).toBe('5,80 €');
    expect(kpis[3].value).toBe('92%');
  });

  it('affiche — plutôt qu’un faux zéro quand la saison n-1 manque', async () => {
    await load({
      ...PAYLOAD,
      kpis: {
        ...PAYLOAD.kpis,
        cashedDeltaPct: null,
        avgBasketDeltaCents: null,
        presenceDeltaPts: null,
      },
    });

    expect(store.kpis()[0].delta).toBe('—');
    expect(store.kpis()[2].delta).toBe('—');
    expect(store.kpis()[3].delta).toBe('—');
  });

  it('colore un delta négatif en avertissement, jamais en succès', async () => {
    await load({ ...PAYLOAD, kpis: { ...PAYLOAD.kpis, cashedDeltaPct: -12 } });

    expect(store.kpis()[0].delta).toBe('-12% vs n-1');
    expect(store.kpis()[0].deltaClass).toBe('text-warn');
  });

  it('ne met dans le graphe que les soirées achevées, plus la prédiction', async () => {
    await load();

    expect(store.chart().map((c) => [c.cmd, c.pred])).toEqual([
      [318, false],
      [290, true],
    ]);
  });

  it('rend l’historique de la plus récente à la plus ancienne, et n’ouvre pas une soirée à venir', async () => {
    await load();

    const rows = store.soirees();
    expect(rows.map((r) => r.n)).toEqual(['Hivernale 2026', 'Rentrée 2025']);
    expect(rows[0].clickable).toBe(false);
    expect(rows[1].clickable).toBe(true);
    expect(rows[1].rev).toBe('1720,00 €');
  });

  it('expose les saisons pour le sélecteur', async () => {
    await load();

    expect(store.seasons().map((s) => s.startYear)).toEqual([2025, 2024]);
    expect(store.season()?.label).toBe('Saison 2025-2026');
  });

  it('recharge sur changement de saison', async () => {
    await load();

    const selected = store.selectSeason(2024);
    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/analytics/season`);
    expect(req.request.params.get('season')).toBe('2024');
    req.flush({ ...PAYLOAD, season: { startYear: 2024, label: 'Saison 2024-2025' } });
    await selected;

    expect(store.season()?.startYear).toBe(2024);
  });

  it('signale l’erreur et garde un écran vide', async () => {
    const loaded = store.load();
    httpMock
      .expectOne((r) => r.url === `${baseUrl}/analytics/season`)
      .error(new ProgressEvent('failed'));
    await loaded;

    expect(store.loading()).toBe('error');
    expect(store.loadError()).toBeTruthy();
    expect(store.kpis()).toEqual([]);
  });
});
