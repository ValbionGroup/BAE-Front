import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, HttpErrorResponse } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';
import { Observable, of, throwError } from 'rxjs';
import { addDays } from 'date-fns';

import { Home, presenceErrorView, presenceLockExplanation } from './home';
import { EventsService } from '#core/services/events/events-service';
import { CoordinationService } from '#core/services/coordination/coordination-service';
import { StocksService } from '#core/services/stocks/stocks-service';
import { TransactionsService } from '#core/services/transactions/transactions-service';
import { ToastService } from '#shared/components/toast/toast.service';
import { Presence } from '#core/models/event.model';
import type { JobPeriod } from '#core/models/job-period.model';
import type { MemberAssignment } from '#core/store/member-assignments.store';

describe(Home.name, () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads every data source it renders, from its own ngOnInit', () => {
    // The home-data stores carry no withHooks({ onInit }) auto-load: the page
    // owns the loading, so injecting nine root stores fires nothing by itself.
    const paths = httpMock
      .match(() => true)
      .map((req) => new URL(req.request.url, 'http://localhost').pathname);

    for (const path of ['/v1/events', '/v1/stocks', '/v1/transactions']) {
      expect(paths).toContain(path);
    }

    // The activity feed is a domain-event trail, not a request log. Until the
    // backend provides one, it must render an explicit "unavailable" state
    // rather than dressing up /v1/logs as activity.
    expect(paths).not.toContain('/v1/logs');
  });

  it('renders skeletons while the stores are still loading', () => {
    expect(fixture.nativeElement.querySelectorAll('bfd-skeleton').length).toBeGreaterThan(0);
  });
});

const MEMBER = { id: 1, points: 0, firstName: 'Lucas', lastName: 'ESPIET', role: 'admin' };

/** The sentence the backend really sends with the 409 — same wording used in
 *  `my-presences.spec.ts`, since both screens face the same refusal. */
const LOCK_MESSAGE =
  'Vous tenez un poste sur cette soirée : votre présence est verrouillée. ' +
  'Demandez au bureau de vous retirer de votre poste avant de vous désengager.';

function poste(period: JobPeriod, jobName: string, pointsDelta = 0): MemberAssignment {
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
  it('repeats the API sentence verbatim on the assignment lock', () => {
    const error = new HttpErrorResponse({
      status: 409,
      error: { code: 'E_PRESENCE_LOCKED_BY_ASSIGNMENT', message: LOCK_MESSAGE },
    });

    const view = presenceErrorView(error);
    expect(view.message).toBe(LOCK_MESSAGE);
    expect(view.title).toBe('Désengagement impossible');
  });

  it('falls back on a generic sentence when the body is not an API error', () => {
    expect(presenceErrorView(new Error('boom')).message).toContain("n'a pas pu être enregistrée");
  });
});

describe('presenceLockExplanation', () => {
  it('names every poste held and the way out', () => {
    const text = presenceLockExplanation([
      poste('before', 'Installation tables'),
      poste('during', 'Service'),
    ]);
    expect(text).toContain('Installation tables');
    expect(text).toContain('Service');
    expect(text).toContain('absent·e');
    expect(text).toMatch(/bureau|coordinateur/);
  });
});

/**
 * The home hero's "votre rôle ce soir-là" panel and its « Absent·e » lock,
 * matching the conventions "mes présences" (task 8) already established:
 * mocked `EventsService`/`CoordinationService` rather than raw HttpClient, so
 * the assignments/preferences fixture can be shaped per test.
 */
describe(Home.name + ' — rôle multi-poste, signe des points, verrou de présence', () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let toast: ToastService;
  let updatePresence: ReturnType<typeof vi.fn>;

  const EVENT_ID = '7';

  const JOBS = [
    { id: 1, name: 'Installation tables', type: 'before' as JobPeriod },
    { id: 2, name: 'Service', type: 'during' as JobPeriod },
    { id: 3, name: 'Vaisselle', type: 'after' as JobPeriod },
  ];

  function assignment(jobId: number, pointsDelta: number, memberId = 1) {
    return { memberId, eventId: 7, jobId, locked: false, pointsDelta, settledAt: null };
  }

  interface SetupOptions {
    assignments?: unknown[];
    preferences?: unknown[];
    updatePresenceForEvent?: () => Observable<unknown>;
  }

  interface Internals {
    respondAbsent(): Promise<void>;
    respondPresent(): Promise<void>;
  }

  function internals(page: Home): Internals {
    return page as unknown as Internals;
  }

  function byId<T extends Element>(id: string): T | null {
    return fixture.nativeElement.querySelector(`#${id}`) as T | null;
  }

  async function setup(options: SetupOptions = {}): Promise<void> {
    updatePresence = vi.fn(
      options.updatePresenceForEvent ?? (() => of(Presence.ABSENT as unknown)),
    );

    const eventsService = {
      fetchAll: () =>
        of([
          { id: EVENT_ID, name: 'Soirée test', location: 'Foyer', date: addDays(new Date(), 3) },
        ]),
      fetchPresenceForEvent: () => of(Presence.PENDING),
      updatePresenceForEvent: updatePresence,
    };

    const coordinationService = {
      loadAll: () =>
        of({
          events: [],
          members: [
            { id: 1, firstName: 'Lucas', lastName: 'ESPIET', roleId: null, role: null, points: 0 },
          ],
          jobs: JOBS,
          eventJobs: [],
          assignments: options.assignments ?? [],
          responses: [],
          preferences: options.preferences ?? [],
        }),
    };

    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        provideMockStore({ initialState: { auth: { member: MEMBER } } }),
        { provide: EventsService, useValue: eventsService },
        { provide: CoordinationService, useValue: coordinationService },
        { provide: StocksService, useValue: { getAll: () => of([]) } },
        { provide: TransactionsService, useValue: { getAll: () => of([]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    toast = TestBed.inject(ToastService);
    await fixture.whenStable();
  }

  afterEach(() => TestBed.resetTestingModule());

  describe('postes held', () => {
    /** D1: up to three postes, one per period, shown before → during → after,
     *  regardless of the order the API returned the rows in. */
    it('shows every poste held, ordered before → during → after', async () => {
      await setup({
        assignments: [assignment(3, 6), assignment(1, 4), assignment(2, -4)],
        preferences: [{ memberId: 1, jobId: 2, preferenceRank: 1 }],
      });

      const cards = Array.from(
        fixture.nativeElement.querySelectorAll('[data-testid="role-poste-name"]'),
      ).map((el) => (el as HTMLElement).textContent?.trim());
      expect(cards).toEqual(['Installation tables', 'Service', 'Vaisselle']);
    });

    /**
     * D5: a good rank COSTS priority credit. The trap this lot hit twice
     * already — printing `·` for anything ≤ 0 — must not resurface here.
     */
    it('renders every delta unhidden, positive and negative alike', async () => {
      await setup({
        assignments: [assignment(3, 6), assignment(1, 4), assignment(2, -4)],
      });

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('+6');
      expect(text).toContain('+4');
      expect(text).toContain('-4');
    });

    it('gives each poste its own rank, null when unranked', async () => {
      await setup({
        assignments: [assignment(2, -4), assignment(1, 4)],
        preferences: [{ memberId: 1, jobId: 2, preferenceRank: 1 }],
      });

      const text = fixture.nativeElement.textContent as string;
      expect(text).toContain('1er choix');
      expect(text).toContain('ne figure pas dans votre classement');
    });
  });

  describe('presence lock', () => {
    it('disables « Absent·e » as soon as a poste is held', async () => {
      await setup({ assignments: [assignment(2, -4)] });

      const button = byId<HTMLButtonElement>('presence-absent');
      expect(button?.disabled).toBe(true);
      expect(button?.getAttribute('aria-describedby')).toBeTruthy();
    });

    it('leaves « Absent·e » active when no poste is held', async () => {
      await setup();

      expect(byId<HTMLButtonElement>('presence-absent')?.disabled).toBe(false);
      expect(byId<HTMLButtonElement>('presence-absent')?.getAttribute('aria-describedby')).toBe(
        null,
      );
    });

    /** D8: an assignment never blocks going back to present. */
    it('keeps « Présent·e » active whether or not a poste is held', async () => {
      await setup({ assignments: [assignment(2, -4)] });
      expect(byId<HTMLButtonElement>('presence-present')?.disabled).toBe(false);
    });

    it('points the disabled button at an explanation naming the poste', async () => {
      await setup({ assignments: [assignment(1, 4)] });

      const button = byId<HTMLButtonElement>('presence-absent')!;
      const describedBy = button.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();

      const explanation = fixture.nativeElement.querySelector(`#${describedBy}`);
      expect(explanation).not.toBeNull();
      expect(explanation.textContent).toContain('Installation tables');
    });

    it('never sends the refusal the screen already knows about', async () => {
      await setup({ assignments: [assignment(2, -4)] });

      await internals(component).respondAbsent();
      expect(updatePresence).not.toHaveBeenCalled();
    });

    /**
     * The switch from `bfd-btn` to raw `<button>` (needed so aria-describedby
     * and disabled land on the real interactive element) must not drop the
     * themed focus ring `bfd-btn` provided for free — a keyboard user tabbing
     * to these buttons would otherwise fall back to the browser default
     * outline, inconsistent with every other custom control in the app.
     */
    it('keeps the themed focus ring on both response buttons', async () => {
      await setup();

      for (const id of ['presence-present', 'presence-absent']) {
        const button = byId<HTMLButtonElement>(id)!;
        expect(button.classList.contains('focus-visible:outline-none')).toBe(true);
        expect(button.classList.contains('focus-visible:ring-2')).toBe(true);
        expect(button.classList.contains('focus-visible:ring-blue/40')).toBe(true);
      }
    });

    it('sends the absence when nothing blocks it', async () => {
      await setup();

      await internals(component).respondAbsent();
      expect(updatePresence).toHaveBeenCalledWith(EVENT_ID, Presence.ABSENT);
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

    it('toasts the API message on a 409', async () => {
      await setup({ updatePresenceForEvent: lockedResponse() });

      await internals(component).respondAbsent();

      const shown = toast.toasts();
      expect(shown).toHaveLength(1);
      expect(shown[0].type).toBe('error');
      expect(shown[0].message).toBe(LOCK_MESSAGE);
    });

    it('reports a plain network failure without inventing a lock', async () => {
      await setup({ updatePresenceForEvent: () => throwError(() => new Error('offline')) });

      await internals(component).respondAbsent();

      expect(toast.toasts()[0].message).toContain("n'a pas pu être enregistrée");
    });

    it('stays silent when the response goes through', async () => {
      await setup();

      await internals(component).respondPresent();

      expect(toast.toasts()).toEqual([]);
    });
  });
});
