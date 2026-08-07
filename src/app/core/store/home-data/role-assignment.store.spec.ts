import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { addDays } from 'date-fns';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { EventsStore } from '#core/store/events.store';

import { RoleAssignmentStore } from './role-assignment.store';

const MEMBER = { id: 1, points: 0, firstName: 'Lucas', lastName: 'ESPIET', role: 'admin' };

interface CoordinationPayloads {
  members?: unknown[];
  jobs?: unknown[];
  eventJobs?: unknown[];
  assignments?: unknown[];
  preferences?: unknown[];
}

describe(RoleAssignmentStore.name, () => {
  let store: InstanceType<typeof RoleAssignmentStore>;
  let events: InstanceType<typeof EventsStore>;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        // RoleAssignmentStore reads the logged-in member from the NgRx auth state.
        provideMockStore({ initialState: { auth: { member: MEMBER } } }),
      ],
    });
    store = TestBed.inject(RoleAssignmentStore);
    events = TestBed.inject(EventsStore);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  /** `/events` is requested twice: once by EventsStore, once inside loadAll(). */
  async function loadEvents(): Promise<void> {
    const loaded = events.load();
    httpMock.expectOne(`${baseUrl}/events`).flush([
      {
        id: '7',
        name: 'Soirée test',
        location: 'Foyer',
        date: addDays(new Date(), 3).toISOString(),
      },
    ]);
    await loaded;
  }

  async function loadCoordination(payloads: CoordinationPayloads = {}): Promise<void> {
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/events`).flush([]);
    httpMock.expectOne(`${baseUrl}/members`).flush(payloads.members ?? []);
    httpMock.expectOne(`${baseUrl}/jobs`).flush(payloads.jobs ?? []);
    httpMock.expectOne(`${baseUrl}/event-jobs`).flush(payloads.eventJobs ?? []);
    httpMock.expectOne(`${baseUrl}/assignments`).flush(payloads.assignments ?? []);
    httpMock.expectOne(`${baseUrl}/responses`).flush([]);
    httpMock.expectOne(`${baseUrl}/preferences`).flush(payloads.preferences ?? []);
    await loaded;
  }

  it('should be created', () => {
    expect(store).toBeTruthy();
  });

  it('has no assignment to show when the member holds no job on the next soirée', async () => {
    await loadEvents();
    await loadCoordination();

    expect(store.loading()).toBe(false);
    expect(store.data()).toEqual([]);
  });

  it('builds the panel from assignments, jobs, event-jobs and members', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [{ id: 1, name: 'Caisse', type: 'during' }],
      eventJobs: [{ eventId: 7, jobId: 1, count: 3 }],
      assignments: [
        { memberId: 1, eventId: 7, jobId: 1, locked: false, pointsDelta: 6 },
        { memberId: 2, eventId: 7, jobId: 1, locked: false, pointsDelta: 6 },
      ],
      members: [
        { id: 1, firstName: 'Lucas', lastName: 'ESPIET', roleId: null, role: null, points: 0 },
        { id: 2, firstName: 'Tommy', lastName: 'Klein', roleId: null, role: null, points: 0 },
      ],
    });

    const data = store.data();
    expect(data).toHaveLength(1);
    expect(data[0].poste).toBe('Caisse');
    expect(data[0].period).toBe('during');
    expect(data[0].meta).toEqual([
      { label: 'Soirée', value: 'Soirée test' },
      { label: 'Effectif du poste', value: '2/3' },
      { label: 'Coéquipiers', value: 'Tommy K.' },
      { label: 'Crédit de priorité', value: '+6' },
    ]);
  });

  /**
   * The mockup asked for an "algo score /100" that nothing computes. What is
   * real is which of the member's own choices the poste was.
   */
  it('reports which of the member’s choices the poste was', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [
        { id: 1, name: 'Caisse', type: 'during' },
        { id: 2, name: 'Bar', type: 'during' },
      ],
      assignments: [{ memberId: 1, eventId: 7, jobId: 2, locked: false, pointsDelta: 8 }],
      preferences: [
        { memberId: 1, jobId: 1, preferenceRank: 1 },
        { memberId: 1, jobId: 2, preferenceRank: 2 },
      ],
    });

    expect(store.data()[0].preferenceRank).toBe(2);
  });

  it('reports a null rank for a poste the member never ranked', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [{ id: 1, name: 'Caisse', type: 'during' }],
      assignments: [{ memberId: 1, eventId: 7, jobId: 1, locked: false, pointsDelta: 0 }],
      preferences: [],
    });

    expect(store.data()[0].preferenceRank).toBeNull();
  });

  it('exposes the priority credit this assignment moved', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [{ id: 1, name: 'Caisse', type: 'during' }],
      assignments: [{ memberId: 1, eventId: 7, jobId: 1, locked: false, pointsDelta: 10 }],
    });

    expect(store.data()[0].meta).toContainEqual({
      label: 'Crédit de priorité',
      value: '+10',
    });
  });

  /**
   * D5: a good rank COSTS priority credit — the "Crédit de priorité" line must
   * show the negative as-is, never hide it behind a `·` or a conditional
   * branch. A trap this lot hit twice already (coordination, mes présences).
   */
  it('renders a negative credit rather than hiding it', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [{ id: 1, name: 'Caisse', type: 'during' }],
      assignments: [{ memberId: 1, eventId: 7, jobId: 1, locked: false, pointsDelta: -4 }],
    });

    expect(store.data()[0].meta).toContainEqual({
      label: 'Crédit de priorité',
      value: '-4',
    });
  });

  /**
   * D1: a member may hold up to three postes on the same soirée, one per
   * period. The panel must show every one, ordered before → during → after —
   * regardless of the order the API returned the assignment rows in — each
   * with its OWN rank and its OWN delta.
   */
  it('shows every poste held on the soirée, ordered before → during → after', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [
        { id: 1, name: 'Installation tables', type: 'before' },
        { id: 2, name: 'Service', type: 'during' },
        { id: 3, name: 'Vaisselle', type: 'after' },
      ],
      // Deliberately out of chronological order in the API response.
      assignments: [
        { memberId: 1, eventId: 7, jobId: 3, locked: false, pointsDelta: 6 },
        { memberId: 1, eventId: 7, jobId: 1, locked: false, pointsDelta: 4 },
        { memberId: 1, eventId: 7, jobId: 2, locked: false, pointsDelta: -4 },
      ],
      preferences: [
        { memberId: 1, jobId: 2, preferenceRank: 1 },
        // job 1 and job 3 are deliberately left unranked.
      ],
    });

    const data = store.data();
    expect(data.map((r) => r.period)).toEqual(['before', 'during', 'after']);
    expect(data.map((r) => r.poste)).toEqual([
      'Installation tables',
      'Service',
      'Vaisselle',
    ]);
    expect(data.map((r) => r.preferenceRank)).toEqual([null, 1, null]);
    expect(data.map((r) => r.meta.find((m) => m.label === 'Crédit de priorité')?.value)).toEqual([
      '+4',
      '-4',
      '+6',
    ]);
  });

  it('reads the preferred job from /preferences, null when never expressed', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [
        { id: 1, name: 'Caisse' },
        { id: 2, name: 'Bar' },
      ],
      preferences: [
        { memberId: 1, jobId: 2, preferenceRank: 2 },
        { memberId: 1, jobId: 1, preferenceRank: 1 },
      ],
    });

    expect(store.preferredPoste()).toBe('Caisse');
  });

  it('reports an error when the coordination call fails', async () => {
    const loaded = store.load();
    // forkJoin fails as soon as one leg does; the others are cancelled.
    httpMock.expectOne(`${baseUrl}/events`).error(new ProgressEvent('failed'));
    await loaded;

    expect(store.error()).toBeTruthy();
    expect(store.data()).toEqual([]);
  });
});
