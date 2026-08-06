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
    expect(store.data()).toBeNull();
  });

  it('builds the panel from assignments, jobs, event-jobs and members', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [{ id: 1, name: 'Caisse' }],
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
    expect(data?.poste).toBe('Caisse');
    expect(data?.meta).toEqual([
      { label: 'Soirée', value: 'Soirée test' },
      { label: 'Effectif du poste', value: '2/3' },
      { label: 'Coéquipiers', value: 'Tommy K.' },
      { label: 'Points de cette affectation', value: '+6' },
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
        { id: 1, name: 'Caisse' },
        { id: 2, name: 'Bar' },
      ],
      assignments: [{ memberId: 1, eventId: 7, jobId: 2, locked: false, pointsDelta: 8 }],
      preferences: [
        { memberId: 1, jobId: 1, preferenceRank: 1 },
        { memberId: 1, jobId: 2, preferenceRank: 2 },
      ],
    });

    expect(store.data()?.preferenceRank).toBe(2);
  });

  it('reports a null rank for a poste the member never ranked', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [{ id: 1, name: 'Caisse' }],
      assignments: [{ memberId: 1, eventId: 7, jobId: 1, locked: false, pointsDelta: 0 }],
      preferences: [],
    });

    expect(store.data()?.preferenceRank).toBeNull();
  });

  it('exposes the points this assignment credited', async () => {
    await loadEvents();
    await loadCoordination({
      jobs: [{ id: 1, name: 'Caisse' }],
      assignments: [{ memberId: 1, eventId: 7, jobId: 1, locked: false, pointsDelta: 10 }],
    });

    expect(store.data()?.meta).toContainEqual({
      label: 'Points de cette affectation',
      value: '+10',
    });
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
    expect(store.data()).toBeNull();
  });
});
