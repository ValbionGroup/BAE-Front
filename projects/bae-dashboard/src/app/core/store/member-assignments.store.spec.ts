import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';
import type { JobPeriod } from '#core/models/job-period.model';

import { MemberAssignmentsStore } from './member-assignments.store';

interface Payloads {
  assignments?: unknown[];
  preferences?: unknown[];
}

/**
 * Postes délibérément dans le désordre : c'est le store qui garantit l'ordre
 * préparation → soirée → nettoyage, quoi qu'ait renvoyé l'API.
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
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(MemberAssignmentsStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  /**
   * Deux routes personnelles, sans permission. Le store lisait auparavant
   * `CoordinationService.loadAll()` — sept requêtes dont quatre derrière
   * `job:read` — et un membre ordinaire n'obtenait donc jamais ses affectations.
   */
  async function load(payloads: Payloads = {}): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/account/assignments`).flush(payloads.assignments ?? []);
    httpMock.expectOne(`${baseUrl}/account/preferences`).flush(payloads.preferences ?? []);
    await loaded;
  }

  /**
   * Le back renvoie le poste déjà résolu. Il ne renvoie **que** les affectations
   * de l'appelant : le filtrage par membre n'existe plus côté client, et c'est
   * un test back (`account_assignments.spec.ts`) qui le garde.
   */
  function assignment(
    eventId: number,
    jobId: number,
    pointsDelta: number,
    extra: Record<string, unknown> = {},
  ) {
    const job = JOBS.find((candidate) => candidate.id === jobId);
    return {
      eventId,
      jobId,
      jobName: job?.name ?? 'Inconnu',
      jobType: job?.type ?? 'during',
      pointsDelta,
      needed: null,
      teammates: [],
      ...extra,
    };
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
    await load({ assignments: [assignment(7, 1, -4), assignment(9, 2, 6)] });

    expect([...store.byEvent().keys()].sort()).toEqual([7, 9]);
    expect(store.assignmentsFor('7').map((a) => a.jobName)).toEqual(['Service']);
    expect(store.assignmentsFor('9').map((a) => a.jobName)).toEqual(['Vaisselle']);
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
    await load({ assignments: [assignment(7, 1, 0, { jobType: 'midnight' })] });

    expect(store.assignmentsFor('7')[0].period).toBe('during');
  });

  it('carries the staffing target and the teammates through untouched', async () => {
    await load({
      assignments: [
        assignment(7, 1, 0, {
          needed: 4,
          teammates: [{ id: 2, firstName: 'Gerda', lastName: 'Mayer' }],
        }),
      ],
    });

    const poste = store.assignmentsFor('7')[0];
    expect(poste.needed).toBe(4);
    expect(poste.teammates.map((t) => t.firstName)).toEqual(['Gerda']);
  });

  it('does not refetch once loaded, but refresh() does', async () => {
    await load({ assignments: [assignment(7, 1, -4)] });

    await store.load();
    httpMock.expectNone(`${baseUrl}/account/assignments`);

    const refreshed = store.refresh();
    httpMock.expectOne(`${baseUrl}/account/assignments`).flush([assignment(7, 2, 6)]);
    httpMock.expectOne(`${baseUrl}/account/preferences`).flush([]);
    await refreshed;

    expect(store.assignmentsFor('7').map((a) => a.jobName)).toEqual(['Vaisselle']);
  });

  it('reports an error and keeps an empty index when the load fails', async () => {
    const loaded = store.load();
    // forkJoin fails as soon as one leg does; the others are cancelled.
    httpMock.expectOne(`${baseUrl}/account/assignments`).error(new ProgressEvent('failed'));
    await loaded;

    expect(store.error()).toBeTruthy();
    expect(store.byEvent().size).toBe(0);
  });
});
