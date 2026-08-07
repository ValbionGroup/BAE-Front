import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { addDays } from 'date-fns';

import {
  MyPresences,
  presenceErrorView,
  presenceLockExplanation,
  type MemberPoste,
} from './my-presences';
import { EventsService } from '#core/services/events/events-service';
import {
  CoordinationService,
  type CoordinationApiData,
} from '#core/services/coordination/coordination-service';
import { Presence, type EventDetail } from '#core/models/event.model';
import { ToastService } from '#shared/components/toast/toast.service';
import type { JobPeriod } from '#core/models/job-period.model';

const MEMBER = { id: 1, firstName: 'Lucas', lastName: 'ESPIET', points: 0, role: 'admin' };

/** The sentence the backend really sends with the 409. */
const LOCK_MESSAGE =
  'Vous tenez un poste sur cette soirée : votre présence est verrouillée. ' +
  'Demandez au bureau de vous retirer de votre poste avant de vous désengager.';

const UPCOMING_ID = '7';
const PAST_ID = '9';

const JOBS = [
  { id: 1, name: 'Service', type: 'during' as JobPeriod },
  { id: 2, name: 'Vaisselle', type: 'after' as JobPeriod },
  { id: 3, name: 'Installation tables', type: 'before' as JobPeriod },
];

function assignment(eventId: number, jobId: number, pointsDelta: number, memberId = 1) {
  return { memberId, eventId, jobId, locked: false, pointsDelta, settledAt: null };
}

function coordinationData(assignments: unknown[] = []): CoordinationApiData {
  return {
    events: [],
    members: [],
    jobs: JOBS,
    eventJobs: [],
    assignments,
    responses: [],
    preferences: [],
  } as unknown as CoordinationApiData;
}

function poste(period: JobPeriod, jobName: string, pointsDelta = 0): MemberPoste {
  const labels: Record<JobPeriod, string> = {
    before: 'Préparation',
    during: 'Soirée',
    after: 'Nettoyage',
  };
  return {
    eventId: 7,
    jobId: 1,
    jobName,
    period,
    periodLabel: labels[period],
    shortPeriodLabel: labels[period],
    pointsDelta,
  };
}

describe('presenceErrorView', () => {
  /**
   * The refusal carries the only actionable sentence there is. Re-wording it
   * front-side would drift from what the backend actually enforces.
   */
  it('repeats the API sentence verbatim on the assignment lock', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { code: 'E_PRESENCE_LOCKED_BY_ASSIGNMENT', message: LOCK_MESSAGE },
    });

    const view = presenceErrorView(error);
    expect(view.message).toBe(LOCK_MESSAGE);
    expect(view.title).toBe('Désengagement impossible');
  });

  it('keeps the API sentence for a code it does not know', () => {
    const error = new HttpErrorResponse({
      status: 422,
      error: { code: 'E_SOMETHING_ELSE', message: 'Un souci très précis côté serveur.' },
    });

    expect(presenceErrorView(error).message).toBe('Un souci très précis côté serveur.');
  });

  it('falls back on a generic sentence when the body is not an API error', () => {
    expect(presenceErrorView(new Error('boom')).message).toContain("n'a pas pu être enregistrée");
  });
});

describe('presenceLockExplanation', () => {
  it('names the single poste held and the way out', () => {
    const text = presenceLockExplanation([poste('during', 'Service')]);
    expect(text).toContain('Service en soirée');
    expect(text).toContain('absent·e');
    // The marche à suivre is the point: a disabled button that does not say how
    // to get unblocked is a dead end.
    expect(text).toMatch(/bureau|coordinateur/);
  });

  it('names every poste when several periods are held', () => {
    const text = presenceLockExplanation([
      poste('before', 'Installation tables'),
      poste('during', 'Service'),
    ]);
    expect(text).toContain('Installation tables');
    expect(text).toContain('Service');
  });
});

describe(MyPresences.name, () => {
  let component: MyPresences;
  let fixture: ComponentFixture<MyPresences>;
  let toast: ToastService;
  let updatePresence: ReturnType<typeof vi.fn>;

  interface Internals {
    postesFor(event: EventDetail): readonly MemberPoste[];
    creditFor(event: EventDetail): number;
    creditLabel(event: EventDetail): string;
    isPresenceLocked(event: EventDetail): boolean;
    respondAbsent(event: EventDetail): Promise<void>;
    respondPresent(event: EventDetail): Promise<void>;
    upcomingEvents(): readonly EventDetail[];
    pastEvents(): readonly EventDetail[];
  }

  function internals(page: MyPresences): Internals {
    return page as unknown as Internals;
  }

  interface SetupOptions {
    assignments?: unknown[];
    /** Successive `loadAll()` payloads, to model a refresh returning new data. */
    coordination?: CoordinationApiData[];
    updatePresenceForEvent?: () => Observable<unknown>;
  }

  async function setup(options: SetupOptions = {}): Promise<void> {
    const payloads = options.coordination ?? [coordinationData(options.assignments ?? [])];
    let call = 0;

    updatePresence = vi.fn(
      options.updatePresenceForEvent ?? (() => of(Presence.ABSENT as unknown)),
    );

    const eventsService = {
      fetchAll: () =>
        of([
          {
            id: UPCOMING_ID,
            name: 'Soirée à venir',
            location: 'Foyer',
            date: addDays(new Date(), 3),
          },
          {
            id: PAST_ID,
            name: 'Soirée passée',
            location: 'Foyer',
            date: addDays(new Date(), -10),
          },
        ]),
      fetchPresenceForEvent: () => of(Presence.PENDING),
      updatePresenceForEvent: updatePresence,
    };

    const coordinationService = {
      loadAll: () => of(payloads[Math.min(call++, payloads.length - 1)]),
      getJobEligibleMembers: () => of([]),
    };

    await TestBed.configureTestingModule({
      imports: [MyPresences],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: { member: MEMBER } } }),
        { provide: EventsService, useValue: eventsService },
        { provide: CoordinationService, useValue: coordinationService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MyPresences);
    component = fixture.componentInstance;
    toast = TestBed.inject(ToastService);
    await fixture.whenStable();
  }

  function upcoming(): EventDetail {
    return internals(component)
      .upcomingEvents()
      .find((e) => e.id === UPCOMING_ID)!;
  }

  function past(): EventDetail {
    return internals(component)
      .pastEvents()
      .find((e) => e.id === PAST_ID)!;
  }

  function byId<T extends Element>(id: string): T | null {
    return fixture.nativeElement.querySelector(`#${id}`) as T | null;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  describe('postes held', () => {
    /** D1: at most one poste per period, the three read chronologically. */
    it('shows both postes of a member staffed on two moments, in order', async () => {
      await setup({
        assignments: [assignment(7, 1, -4), assignment(7, 3, 4)],
      });

      const postes = internals(component).postesFor(upcoming());
      expect(postes.map((p) => p.jobName)).toEqual(['Installation tables', 'Service']);
      expect(postes.map((p) => p.periodLabel)).toEqual(['Préparation', 'Soirée']);
    });

    it('renders the poste and its moment on the upcoming card', async () => {
      await setup({ assignments: [assignment(7, 3, 4)] });

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('Installation tables');
      expect(text).toContain('Préparation');
    });

    it('shows no poste for a member staffed on nobody else’s soirée', async () => {
      await setup({ assignments: [assignment(7, 1, -4, 2)] });

      expect(internals(component).postesFor(upcoming())).toEqual([]);
    });

    it('leaves the history dash in place for a soirée without any poste', async () => {
      await setup();

      expect(internals(component).postesFor(past())).toEqual([]);
      expect(internals(component).creditLabel(past())).toBe('—');
    });
  });

  describe('priority credit', () => {
    it('sums the pointsDelta of every poste of the soirée', async () => {
      await setup({
        assignments: [assignment(9, 1, -4), assignment(9, 3, 4), assignment(9, 2, 6)],
      });

      expect(internals(component).creditFor(past())).toBe(6);
      expect(internals(component).creditLabel(past())).toBe('+6 pts');
    });

    /**
     * The trap the coordination page fell into: printing `·` for anything ≤ 0.
     * A negative credit is normal — "you got what you asked for, it cost you
     * priority" — and hiding it makes the whole mechanism unreadable.
     */
    it('renders a negative total rather than hiding it', async () => {
      await setup({ assignments: [assignment(9, 1, -4), assignment(9, 3, -2)] });

      expect(internals(component).creditFor(past())).toBe(-6);
      expect(internals(component).creditLabel(past())).toBe('-6 pts');
    });

    it('tells a zero-credit poste apart from no poste at all', async () => {
      await setup({ assignments: [assignment(9, 1, 0)] });

      expect(internals(component).creditLabel(past())).toBe('0 pt');
    });

    it('prints the negative total in the history row', async () => {
      await setup({ assignments: [assignment(9, 1, -4)] });

      expect(fixture.nativeElement.textContent).toContain('-4 pts');
    });
  });

  describe('presence lock', () => {
    it('disables « Absent·e » as soon as a poste is held', async () => {
      await setup({ assignments: [assignment(7, 1, -4)] });

      expect(internals(component).isPresenceLocked(upcoming())).toBe(true);
      expect(byId<HTMLButtonElement>(`presence-absent-${UPCOMING_ID}`)?.disabled).toBe(true);
    });

    /** Disabled, never hidden: a button that disappears reads as a bug. */
    it('keeps the disabled « Absent·e » button in the DOM', async () => {
      await setup({ assignments: [assignment(7, 1, -4)] });

      expect(byId(`presence-absent-${UPCOMING_ID}`)).not.toBeNull();
    });

    it('leaves « Absent·e » active when no poste is held', async () => {
      await setup();

      expect(internals(component).isPresenceLocked(upcoming())).toBe(false);
      expect(byId<HTMLButtonElement>(`presence-absent-${UPCOMING_ID}`)?.disabled).toBe(false);
    });

    /** D8: an assignment never blocks going back to present. */
    it('keeps « Présent·e » active whether or not a poste is held', async () => {
      await setup({ assignments: [assignment(7, 1, -4)] });
      expect(byId<HTMLButtonElement>(`presence-present-${UPCOMING_ID}`)?.disabled).toBe(false);

      await TestBed.resetTestingModule();
      await setup();
      expect(byId<HTMLButtonElement>(`presence-present-${UPCOMING_ID}`)?.disabled).toBe(false);
    });

    /** `disabled` alone says nothing; the reason has to be announced with it. */
    it('points the disabled button at an explanation naming the poste', async () => {
      await setup({ assignments: [assignment(7, 3, 4)] });

      const button = byId<HTMLButtonElement>(`presence-absent-${UPCOMING_ID}`)!;
      const describedBy = button.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();

      const explanation = fixture.nativeElement.querySelector(`#${describedBy}`);
      expect(explanation).not.toBeNull();
      expect(explanation.textContent).toContain('Installation tables');
      expect(explanation.textContent).toMatch(/bureau|coordinateur/);
    });

    it('describes nothing when the button is usable', async () => {
      await setup();

      const button = byId<HTMLButtonElement>(`presence-absent-${UPCOMING_ID}`)!;
      expect(button.getAttribute('aria-describedby')).toBeNull();
    });

    it('never sends the refusal the screen already knows about', async () => {
      await setup({ assignments: [assignment(7, 1, -4)] });

      await internals(component).respondAbsent(upcoming());
      expect(updatePresence).not.toHaveBeenCalled();
    });

    it('sends the absence when nothing blocks it', async () => {
      await setup();

      await internals(component).respondAbsent(upcoming());
      expect(updatePresence).toHaveBeenCalledWith(UPCOMING_ID, Presence.ABSENT);
    });
  });

  describe('server-side refusal', () => {
    function lockedResponse() {
      return () =>
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { code: 'E_PRESENCE_LOCKED_BY_ASSIGNMENT', message: LOCK_MESSAGE },
            }),
        );
    }

    /**
     * Another tab, or an assignment created since this page loaded: the screen
     * believes the member is free, the server knows better.
     */
    it('toasts the API message on a 409', async () => {
      await setup({ updatePresenceForEvent: lockedResponse() });

      await internals(component).respondAbsent(upcoming());

      const shown = toast.toasts();
      expect(shown).toHaveLength(1);
      expect(shown[0].type).toBe('error');
      expect(shown[0].message).toBe(LOCK_MESSAGE);
    });

    it('re-reads the assignments so the lock becomes visible', async () => {
      await setup({
        coordination: [coordinationData([]), coordinationData([assignment(7, 1, -4)])],
        updatePresenceForEvent: lockedResponse(),
      });

      expect(internals(component).isPresenceLocked(upcoming())).toBe(false);
      await internals(component).respondAbsent(upcoming());
      await fixture.whenStable();

      expect(internals(component).isPresenceLocked(upcoming())).toBe(true);
    });

    it('reports a plain network failure without inventing a lock', async () => {
      await setup({
        updatePresenceForEvent: () => throwError(() => new Error('offline')),
      });

      await internals(component).respondAbsent(upcoming());

      expect(toast.toasts()[0].message).toContain("n'a pas pu être enregistrée");
    });

    it('reports a failed « Présent·e » too', async () => {
      await setup({
        updatePresenceForEvent: () => throwError(() => new Error('offline')),
      });

      await internals(component).respondPresent(upcoming());

      expect(toast.toasts()).toHaveLength(1);
    });

    it('stays silent when the response goes through', async () => {
      await setup();

      await internals(component).respondPresent(upcoming());

      expect(toast.toasts()).toEqual([]);
    });
  });
});
