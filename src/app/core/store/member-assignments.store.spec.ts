import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { JobPeriod } from '#core/models/job-period.model';

import { MemberAssignmentsStore } from './member-assignments.store';

const MEMBER = { id: 1, points: 0, firstName: 'Lucas', lastName: 'ESPIET', role: 'admin' };

interface Payloads {
  jobs?: unknown[];
  assignments?: unknown[];
}

/**
 * Deliberately non-chronological jobs and assignments: the store is what
 * guarantees the préparation → soirée → nettoyage order, whatever the API
 * returned.
 */
const JOBS = [
  { id: 1, name: 'Service', type: 'during' as JobPeriod },
  { id: 2, name: 'Vaisselle', type: 'after' as JobPeriod },
  { id: 3, name: 'Installation tables', type: 'before' as JobPeriod },
];

describe(MemberAssignmentsStore.name, () => {
  let store: InstanceType<typeof MemberAssignmentsStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideMockStore({ initialState: { auth: { member: MEMBER } } }),
      ],
    });
    store = TestBed.inject(MemberAssignmentsStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  async function load(payloads: Payloads = {}): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/events`).flush([]);
    httpMock.expectOne(`${baseUrl}/members`).flush([]);
    httpMock.expectOne(`${baseUrl}/jobs`).flush(payloads.jobs ?? JOBS);
    httpMock.expectOne(`${baseUrl}/event-jobs`).flush([]);
    httpMock.expectOne(`${baseUrl}/assignments`).flush(payloads.assignments ?? []);
    httpMock.expectOne(`${baseUrl}/responses`).flush([]);
    httpMock.expectOne(`${baseUrl}/preferences`).flush([]);
    await loaded;
  }

  function assignment(eventId: number, jobId: number, pointsDelta: number) {
    return { memberId: 1, eventId, jobId, locked: false, pointsDelta, settledAt: null };
  }

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('holds nothing before it is loaded', () => {
    expect(store.byEvent().size).toBe(0);
    expect(store.assignmentsFor('7')).toEqual([]);
  });

  /** Unlike RoleAssignmentStore's panel, this covers EVERY soirée at once. */
  it('indexes the member’s postes by soirée, not just the next one', async () => {
    await load({
      assignments: [assignment(7, 1, -4), assignment(9, 2, 6)],
    });

    expect([...store.byEvent().keys()].sort()).toEqual([7, 9]);
    expect(store.assignmentsFor('7').map((a) => a.jobName)).toEqual(['Service']);
    expect(store.assignmentsFor('9').map((a) => a.jobName)).toEqual(['Vaisselle']);
  });

  it('keeps only the logged-in member’s rows', async () => {
    await load({
      assignments: [
        assignment(7, 1, -4),
        { memberId: 2, eventId: 7, jobId: 2, locked: false, pointsDelta: 6, settledAt: null },
      ],
    });

    expect(store.assignmentsFor('7').map((a) => a.jobName)).toEqual(['Service']);
  });

  /** D1: at most one poste per period, and the three read chronologically. */
  it('orders a soirée’s postes préparation → soirée → nettoyage', async () => {
    await load({
      assignments: [assignment(7, 1, -4), assignment(7, 2, 6), assignment(7, 3, 4)],
    });

    expect(store.assignmentsFor('7').map((a) => a.period)).toEqual(['before', 'during', 'after']);
    expect(store.assignmentsFor('7').map((a) => a.periodLabel)).toEqual([
      'Préparation',
      'Soirée',
      'Nettoyage',
    ]);
  });

  it('sums the soirée’s credit, negative included', async () => {
    await load({
      assignments: [assignment(7, 1, -4), assignment(7, 3, 4), assignment(7, 2, 6)],
    });

    expect(store.creditFor('7')).toBe(6);
  });

  it('reports a negative total when every poste was a first choice', async () => {
    await load({ assignments: [assignment(7, 1, -4), assignment(7, 3, -2)] });

    expect(store.creditFor('7')).toBe(-6);
  });

  it('reports a zero credit for a soirée the member holds nothing on', async () => {
    await load({ assignments: [assignment(7, 1, -4)] });

    expect(store.assignmentsFor('9')).toEqual([]);
    expect(store.creditFor('9')).toBe(0);
  });

  /** `jobs.type` has no DB check constraint: an unknown value must not make the
   *  poste vanish from the member's list. */
  it('falls back on the soirée itself for a period it does not know', async () => {
    await load({
      jobs: [{ id: 1, name: 'Afterwork', type: 'midnight' }],
      assignments: [assignment(7, 1, 0)],
    });

    expect(store.assignmentsFor('7')[0].period).toBe('during');
  });

  it('names a poste whose job disappeared rather than dropping the row', async () => {
    await load({ jobs: [], assignments: [assignment(7, 42, 0)] });

    expect(store.assignmentsFor('7')[0].jobName).toBe('Poste #42');
  });

  it('does not refetch once loaded, but refresh() does', async () => {
    await load({ assignments: [assignment(7, 1, -4)] });

    await store.load();
    httpMock.expectNone(`${baseUrl}/assignments`);

    const refreshed = store.refresh();
    httpMock.expectOne(`${baseUrl}/events`).flush([]);
    httpMock.expectOne(`${baseUrl}/members`).flush([]);
    httpMock.expectOne(`${baseUrl}/jobs`).flush(JOBS);
    httpMock.expectOne(`${baseUrl}/event-jobs`).flush([]);
    httpMock.expectOne(`${baseUrl}/assignments`).flush([assignment(7, 2, 6)]);
    httpMock.expectOne(`${baseUrl}/responses`).flush([]);
    httpMock.expectOne(`${baseUrl}/preferences`).flush([]);
    await refreshed;

    expect(store.assignmentsFor('7').map((a) => a.jobName)).toEqual(['Vaisselle']);
  });

  it('reports an error and keeps an empty index when the load fails', async () => {
    const loaded = store.load();
    // forkJoin fails as soon as one leg does; the others are cancelled.
    httpMock.expectOne(`${baseUrl}/events`).error(new ProgressEvent('failed'));
    await loaded;

    expect(store.error()).toBeTruthy();
    expect(store.byEvent().size).toBe(0);
  });
});
