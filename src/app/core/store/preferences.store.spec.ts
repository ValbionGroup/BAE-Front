import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '#core/tokens/api-url.token';

import { PreferencesStore } from './preferences.store';

const JOBS = [
  { id: 1, name: 'Barman' },
  { id: 2, name: 'Caissier' },
  { id: 3, name: 'Sécurité' },
];

describe(PreferencesStore.name, () => {
  let store: InstanceType<typeof PreferencesStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(PreferencesStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => TestBed.resetTestingModule());

  async function load(mine: { jobId: number; name: string; preferenceRank: number }[] = []) {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/jobs`).flush(JOBS);
    httpMock.expectOne(`${baseUrl}/account/preferences`).flush(mine);
    await loaded;
  }

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('orders the ranking by rank, not by the order the API happened to return', async () => {
    await load([
      { jobId: 3, name: 'Sécurité', preferenceRank: 2 },
      { jobId: 1, name: 'Barman', preferenceRank: 1 },
    ]);

    expect(store.ranked().map((j) => j.id)).toEqual([1, 3]);
  });

  it('offers only the unranked jobs, alphabetically', async () => {
    await load([{ jobId: 3, name: 'Sécurité', preferenceRank: 1 }]);

    expect(store.available().map((j) => j.name)).toEqual(['Barman', 'Caissier']);
  });

  it('moves a job up and down without losing the others', async () => {
    await load([
      { jobId: 1, name: 'Barman', preferenceRank: 1 },
      { jobId: 2, name: 'Caissier', preferenceRank: 2 },
      { jobId: 3, name: 'Sécurité', preferenceRank: 3 },
    ]);

    store.move(3, -1);
    expect(store.ranked().map((j) => j.id)).toEqual([1, 3, 2]);

    store.move(3, 1);
    expect(store.ranked().map((j) => j.id)).toEqual([1, 2, 3]);
  });

  it('refuses to move past either end', async () => {
    await load([{ jobId: 1, name: 'Barman', preferenceRank: 1 }]);

    store.move(1, -1);
    store.move(1, 1);

    expect(store.ranked().map((j) => j.id)).toEqual([1]);
  });

  it('tracks unsaved changes and can discard them', async () => {
    await load([{ jobId: 1, name: 'Barman', preferenceRank: 1 }]);
    expect(store.dirty()).toBe(false);

    store.add(2);
    expect(store.dirty()).toBe(true);

    store.reset();
    expect(store.dirty()).toBe(false);
    expect(store.ranked().map((j) => j.id)).toEqual([1]);
  });

  it('never ranks the same job twice', async () => {
    await load([{ jobId: 1, name: 'Barman', preferenceRank: 1 }]);

    store.add(1);

    expect(store.ranked().map((j) => j.id)).toEqual([1]);
  });

  /** The API derives rank from position, so the request must be an ordered id list. */
  it('sends the ranking as an ordered list of ids', async () => {
    await load();
    store.add(2);
    store.add(1);

    const saving = store.save();
    const req = httpMock.expectOne(`${baseUrl}/account/preferences`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ jobIds: [2, 1] });
    req.flush([
      { jobId: 2, name: 'Caissier', preferenceRank: 1 },
      { jobId: 1, name: 'Barman', preferenceRank: 2 },
    ]);

    expect(await saving).toBe(true);
    expect(store.dirty()).toBe(false);
  });

  it('keeps the draft and reports an error when saving fails', async () => {
    await load();
    store.add(2);

    const saving = store.save();
    httpMock.expectOne(`${baseUrl}/account/preferences`).error(new ProgressEvent('failed'));

    expect(await saving).toBe(false);
    expect(store.saveError()).toBeTruthy();
    expect(store.ranked().map((j) => j.id)).toEqual([2]);
    expect(store.dirty()).toBe(true);
  });

  it('does not refetch once loaded', async () => {
    await load();
    await store.load();
    httpMock.verify();
  });
});
