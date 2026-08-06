import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { ApiTransaction } from '#core/services/transactions/transactions-service';
import { EventsStore } from '#core/store/events.store';

import { EncaissementsStore } from './encaissements.store';

const TRANSACTIONS: ApiTransaction[] = [
  {
    id: 900003,
    type: 'cash',
    amount: 42.25,
    eventId: 7,
    orderIds: [900003],
    createdAt: '2026-08-04T23:29:21.775+00:00',
  },
  {
    id: 900001,
    type: 'cash',
    amount: 124.5,
    eventId: 10,
    orderIds: [900001],
    createdAt: '2026-07-06T23:29:21.775+00:00',
  },
  {
    id: 900002,
    type: 'lydia',
    amount: 86,
    eventId: 10,
    orderIds: [900002],
    createdAt: '2026-07-06T23:29:21.775+00:00',
  },
  {
    id: 900004,
    type: 'cash',
    amount: 10,
    eventId: null,
    orderIds: [],
    createdAt: '2026-07-06T23:29:21.775+00:00',
  },
];

describe(EncaissementsStore.name, () => {
  let store: InstanceType<typeof EncaissementsStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(EncaissementsStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  async function load(rows: ApiTransaction[] = TRANSACTIONS): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/transactions`).flush(rows);
    await loaded;
  }

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('renders an empty chart before loading, without dividing by zero', () => {
    expect(store.loading()).toBe(true);
    expect(store.data()).toEqual([]);
    expect(store.max()).toBe(1);
  });

  it('groups transactions per event and splits them by payment method', async () => {
    await load();

    // Events are not loaded here, so labels fall back to the event id.
    const byLabel = new Map(store.data().map((b) => [b.label, b]));
    expect(byLabel.get('Soirée 10')).toEqual({
      label: 'Soirée 10',
      v1: 124.5,
      v2: 86,
      isNext: false,
    });
    expect(byLabel.get('Soirée 7')).toEqual({ label: 'Soirée 7', v1: 42.25, v2: 0, isNext: false });
    expect(store.max()).toBe(124.5);
    expect(store.total()).toBe(252.75);
  });

  it('drops transactions that settle no event — they belong to no soirée', async () => {
    await load();
    expect(store.data().length).toBe(2);
  });

  it('never marks a bar as a projection: there is no forecasting endpoint', async () => {
    await load();
    expect(store.data().every((b) => b.isNext === false)).toBe(true);
  });

  it('caps the chart to the selected number of soirées', async () => {
    await load();
    expect(store.data().length).toBe(2);
    store.setLimit(1);
    expect(store.data().length).toBe(1);
  });

  it('orders the bars chronologically and labels them with the event date', async () => {
    const events = TestBed.inject(EventsStore);
    const eventsLoaded = events.load();
    httpMock.expectOne(`${baseUrl}/events`).flush([
      { id: '7', name: 'Récente', location: 'Foyer', date: '2026-08-04T20:00:00.000+00:00' },
      { id: '10', name: 'Ancienne', location: 'Foyer', date: '2026-07-06T20:00:00.000+00:00' },
    ]);
    await eventsLoaded;
    await load();

    expect(store.data().map((b) => b.label)).toEqual(['06 juil', '04 août']);

    store.setLimit(1);
    expect(store.data().map((b) => b.label)).toEqual(['04 août']);
  });

  it('does not refetch once loaded', async () => {
    await load();
    await store.load();
    httpMock.verify();
  });

  it('reports an error and keeps an empty chart when the call fails', async () => {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/transactions`).error(new ProgressEvent('failed'));
    await loaded;

    expect(store.error()).toBeTruthy();
    expect(store.data()).toEqual([]);
    expect(store.loading()).toBe(false);
  });
});
