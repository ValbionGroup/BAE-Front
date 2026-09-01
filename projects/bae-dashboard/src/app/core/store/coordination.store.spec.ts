import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { CoordinationStore } from './coordination.store';

const IN_A_YEAR = new Date(Date.now() + 365 * 86_400_000).toISOString();
const A_YEAR_AGO = new Date(Date.now() - 365 * 86_400_000).toISOString();

describe(CoordinationStore.name, () => {
  let store: InstanceType<typeof CoordinationStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(CoordinationStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  async function load(events: unknown[]): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/events`).flush(events);
    for (const path of ['members', 'jobs', 'event-jobs', 'assignments', 'responses', 'preferences'])
      httpMock.expectOne(`${baseUrl}/${path}`).flush([]);
    await loaded;
  }

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('classes une soirée achevée comme passée, même datée dans le futur', async () => {
    await load([
      { id: 1, name: 'Close en avance', date: IN_A_YEAR, duration: null, status: 'completed' },
    ]);

    const [event] = store.events();
    expect(event.status).toBe('past');
    expect(event.statusLabel).toBe('Achevée');
  });

  it('garde une soirée à venir en préparation tant que le back ne la clôt pas', async () => {
    await load([{ id: 2, name: 'À venir', date: IN_A_YEAR, duration: null, status: 'scheduled' }]);

    const [event] = store.events();
    expect(event.status).toBe('preparing');
    expect(event.statusLabel).toBe('En préparation');
  });

  it('classe une soirée dont la date est dépassée comme passée', async () => {
    await load([{ id: 3, name: 'Ancienne', date: A_YEAR_AGO, duration: null, status: 'scheduled' }]);

    const [event] = store.events();
    expect(event.status).toBe('past');
    expect(event.statusLabel).toBe('Passée');
  });
});
