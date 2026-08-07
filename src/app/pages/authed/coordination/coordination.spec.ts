import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import {
  Coordination,
  buildEventsData,
  describeMatching,
  matchingErrorMessage,
} from './coordination';
import {
  CoordinationService,
  type ApiMatchingSummary,
  type CoordinationApiData,
} from '#core/services/coordination/coordination-service';
import type { JobPeriod } from '#core/models/job-period.model';
import { ModalService } from '#shared/components/modal/modal.service';
import { ToastService } from '#shared/components/toast/toast.service';
import type { ModalAction, MessageModalConfig } from '#shared/components/modal/modal.models';

/** The page exposes its behaviour as `protected` members; the specs drive them
 *  through this narrow view instead of casting to `any` at each call site. */
interface CoordinationInternals {
  confirmRunMatching(): void;
  toggleLock(memberId: number, jobId: number): void;
  assignMember(memberId: number, roleId: number): void;
  validateAssignments(): void;
  lockedCount(): number;
  replaceableCount(): number;
  isSettled(): boolean;
  algoRunning(): boolean;
  lastOutcome(): { tone: string; title: string; message: string } | null;
  postes(): { id: number; assigned: { id: number; lock: boolean; pointsDelta: number }[] }[];
  posteGroups(): {
    period: JobPeriod;
    label: string;
    postes: { id: number; label: string }[];
    assignedCount: number;
    neededCount: number;
    toFill: number;
    isFull: boolean;
  }[];
  lockBreakdown(): { period: JobPeriod; label: string; locked: number; replaceable: number }[];
  availableMembersFor(period: JobPeriod): { id: number }[];
  membres(): {
    id: number;
    hasAssignment: boolean;
    assignments: { period: JobPeriod; jobId: number; jobName: string; lock: boolean }[];
  }[];
}

function internals(component: Coordination): CoordinationInternals {
  return component as unknown as CoordinationInternals;
}

function summary(overrides: Partial<ApiMatchingSummary> = {}): ApiMatchingSummary {
  return { matched: [], unmatchedMemberIds: [], locked: [], ...overrides };
}

function match(
  memberId: number,
  jobId: number,
  period: JobPeriod,
): ApiMatchingSummary['matched'][number] {
  return { memberId, jobId, period, rankAchieved: 1, pointsDelta: 4 };
}

/**
 * Deliberately non-chronological `eventJobs`, and a member (1) holding a job on
 * two different periods: both are the cases the grouping has to survive.
 */
function baseData(overrides: Partial<CoordinationApiData> = {}): CoordinationApiData {
  return {
    events: [{ id: 1, name: 'Soiree Test', date: new Date().toISOString(), duration: 3600 }],
    members: [
      {
        id: 1,
        firstName: 'Test',
        lastName: 'User',
        roleId: 3,
        role: { id: 3, name: 'member' },
        points: 80,
      },
      {
        id: 2,
        firstName: 'Autre',
        lastName: 'Membre',
        roleId: 3,
        role: { id: 3, name: 'member' },
        points: 40,
      },
    ],
    jobs: [
      { id: 1, name: 'Barman', type: 'during' },
      { id: 2, name: 'Sécurité', type: 'during' },
      { id: 3, name: 'Installation', type: 'before' },
      { id: 4, name: 'Vaisselle', type: 'after' },
    ],
    eventJobs: [
      { eventId: 1, jobId: 2, count: 1 },
      { eventId: 1, jobId: 4, count: 1 },
      { eventId: 1, jobId: 3, count: 1 },
      { eventId: 1, jobId: 1, count: 1 },
    ],
    assignments: [
      { memberId: 1, eventId: 1, jobId: 1, locked: true, pointsDelta: 10, settledAt: null },
      { memberId: 1, eventId: 1, jobId: 3, locked: false, pointsDelta: 4, settledAt: null },
      { memberId: 2, eventId: 1, jobId: 2, locked: false, pointsDelta: 6, settledAt: null },
    ],
    responses: [
      { memberId: 1, eventId: 1, isAvailable: true },
      { memberId: 2, eventId: 1, isAvailable: true },
    ],
    preferences: [{ memberId: 1, jobId: 1, preferenceRank: 1 }],
    ...overrides,
  };
}

describe('describeMatching', () => {
  it('breaks a full success down by period', () => {
    const outcome = describeMatching(
      summary({
        matched: [match(1, 3, 'before'), match(2, 1, 'during'), match(3, 4, 'after')],
      }),
    );
    expect(outcome.tone).toBe('success');
    expect(outcome.message).toContain('3 affectations générées');
    expect(outcome.message).toContain('1 en préparation · 1 en soirée · 1 en nettoyage');
  });

  it('names a period nobody was placed on rather than hiding it', () => {
    const outcome = describeMatching(summary({ matched: [match(1, 1, 'during')] }));
    expect(outcome.tone).toBe('success');
    expect(outcome.message).toContain('0 en préparation · 1 en soirée · 0 en nettoyage');
  });

  it('mentions preserved locked rows in the success message', () => {
    const outcome = describeMatching(
      summary({
        matched: [match(1, 1, 'during'), match(3, 1, 'during')],
        locked: [{ memberId: 2, jobId: 2, period: 'during' }],
      }),
    );
    expect(outcome.tone).toBe('success');
    expect(outcome.message).toContain('2 affectations générées');
    expect(outcome.message).toContain('1 affectation verrouillée conservée');
  });

  /**
   * Preferences being implicitly complete (D2), a member left out no longer
   * means "no job matched their taste".
   */
  it('stops blaming the rankings when members stay unplaced', () => {
    const outcome = describeMatching(
      summary({ matched: [match(1, 1, 'during')], unmatchedMemberIds: [2, 3] }),
    );
    expect(outcome.tone).toBe('warning');
    expect(outcome.title).toBe('Des membres sont restés sans poste');
    expect(outcome.message).toContain('2 membres disponibles sont restés sans poste');
    expect(outcome.message).toContain('Ajoutez des postes');
    expect(outcome.message).not.toContain('préférences');
  });

  /**
   * `runMatching` also filters candidates through `job_eligible_members`, so a
   * member can stay unplaced while a seat IS free — on a poste they are not
   * allowed on. Affirming "toutes les places sont prises" would send the user
   * adding postes, which changes nothing.
   */
  it('never affirms that every seat is taken', () => {
    const outcome = describeMatching(
      summary({ matched: [match(1, 1, 'during')], unmatchedMemberIds: [2] }),
    );
    expect(outcome.message).not.toContain('toutes les places sont prises');
    expect(outcome.message).toContain('aucune place libre ne lui était ouverte');
  });

  it('points at the eligibility rules too when the soirée has a restricted poste', () => {
    const restricted = describeMatching(
      summary({ matched: [match(1, 1, 'during')], unmatchedMemberIds: [2] }),
      true,
    );
    expect(restricted.message).toContain('éligibilit');

    const open = describeMatching(
      summary({ matched: [match(1, 1, 'during')], unmatchedMemberIds: [2] }),
    );
    expect(open.message).not.toContain('éligibilit');
  });

  it('never claims success when nothing was matched and members were left out', () => {
    const outcome = describeMatching(summary({ unmatchedMemberIds: [1, 2] }));
    expect(outcome.tone).toBe('warning');
    expect(outcome.title).toBe('Aucune affectation générée');
    expect(outcome.message).not.toContain('préférences');
    expect(outcome.message).toContain('aucune place libre ne leur était ouverte');
  });

  it('mentions the eligibility rules on an empty run too', () => {
    const outcome = describeMatching(summary({ unmatchedMemberIds: [1, 2] }), true);
    expect(outcome.message).toContain('éligibilit');
  });

  it('explains that every seat is already locked', () => {
    const outcome = describeMatching(
      summary({ locked: [{ memberId: 1, jobId: 1, period: 'during' }] }),
    );
    expect(outcome.tone).toBe('info');
    expect(outcome.title).toBe('Rien à réaffecter');
    expect(outcome.message).toContain('1 affectation verrouillée conservée');
  });

  it('reports an empty run as info, not success', () => {
    const outcome = describeMatching(summary());
    expect(outcome.tone).toBe('info');
    expect(outcome.title).toBe('Rien à affecter');
  });

  /** An orphaned locked row — its job was deleted — carries `period: null`. */
  it('survives a locked row whose period is unknown', () => {
    const outcome = describeMatching(
      summary({
        matched: [match(1, 1, 'during')],
        locked: [{ memberId: 2, jobId: 9, period: null }],
      }),
    );
    expect(outcome.tone).toBe('success');
    expect(outcome.message).toContain('1 affectation verrouillée conservée');
  });
});

describe('matchingErrorMessage', () => {
  it('explains a settled soirée instead of a generic failure', () => {
    const message = matchingErrorMessage(
      new HttpErrorResponse({
        status: 409,
        error: { code: 'E_EVENT_ALREADY_SETTLED', message: 'Event already settled' },
      }),
    );
    expect(message).toContain('consolidés');
    expect(message).not.toContain('Event already settled');
  });

  it('falls back on the API wording for an unknown code', () => {
    const message = matchingErrorMessage(
      new HttpErrorResponse({
        status: 422,
        error: { code: 'E_SOMETHING_NEW', message: 'Un souci très précis côté serveur.' },
      }),
    );
    expect(message).toBe('Un souci très précis côté serveur.');
  });

  it('falls back on a generic sentence when the body is not an API error', () => {
    expect(matchingErrorMessage(new Error('boom'))).toContain("n'a pas pu être exécuté");
  });
});

describe('buildEventsData', () => {
  it('carries the server lock flag and points delta onto each assignment', () => {
    const [eventData] = buildEventsData(baseData(), new Set());
    const barman = eventData.roles.find((r) => r.id === 1)!;
    expect(barman.assigned).toEqual([
      { memberId: 1, locked: true, pointsDelta: 10, settledAt: null },
    ]);
  });

  it('reads the period of each poste from its job', () => {
    const [eventData] = buildEventsData(baseData(), new Set());
    expect(eventData.roles.find((r) => r.id === 3)!.period).toBe('before');
    expect(eventData.roles.find((r) => r.id === 1)!.period).toBe('during');
    expect(eventData.roles.find((r) => r.id === 4)!.period).toBe('after');
  });

  /** The column has no DB check constraint: a value the front does not know
   *  must degrade to the default moment rather than break the grouping. */
  it('falls back on the soirée itself for an unrecognised period', () => {
    const data = baseData({
      jobs: [{ id: 1, name: 'Barman', type: 'midnight' as JobPeriod }],
      eventJobs: [{ eventId: 1, jobId: 1, count: 1 }],
      assignments: [],
    });
    const [eventData] = buildEventsData(data, new Set());
    expect(eventData.roles[0].period).toBe('during');
  });

  it('marks a job restricted only when it has eligibility rows', () => {
    const [eventData] = buildEventsData(baseData(), new Set([2]));
    expect(eventData.roles.find((r) => r.id === 1)!.restricted).toBe(false);
    expect(eventData.roles.find((r) => r.id === 2)!.restricted).toBe(true);
  });

  it('flags an event as settled as soon as one assignment carries a settledAt', () => {
    expect(buildEventsData(baseData(), new Set())[0].settled).toBe(false);

    const settled = baseData({
      assignments: [
        { memberId: 1, eventId: 1, jobId: 1, locked: true, pointsDelta: 10, settledAt: null },
        {
          memberId: 2,
          eventId: 1,
          jobId: 2,
          locked: false,
          pointsDelta: 6,
          settledAt: '2026-01-01T00:00:00.000Z',
        },
      ],
    });
    expect(buildEventsData(settled, new Set())[0].settled).toBe(true);
  });
});

describe(Coordination.name, () => {
  let component: Coordination;
  let fixture: ComponentFixture<Coordination>;
  let modal: ModalService;
  let toast: ToastService;
  let runMatching: ReturnType<typeof vi.fn>;
  let setAssignmentLock: ReturnType<typeof vi.fn>;

  async function setup(
    data: CoordinationApiData = baseData(),
    serviceOverrides: Record<string, unknown> = {},
  ): Promise<void> {
    runMatching = vi.fn(() => of(summary()));
    setAssignmentLock = vi.fn(() => of(null));

    const mockService = {
      loadAll: () => of(data),
      assign: () => of(null),
      unassign: () => of(null),
      createJob: () => of(null),
      updateJob: () => of(null),
      deleteJob: () => of(null),
      createEventJob: () => of(null),
      updateEventJob: () => of(null),
      deleteEventJob: () => of(null),
      getJobEligibleMembers: () => of([{ jobId: 2, memberId: 2 }]),
      runMatching,
      setAssignmentLock,
      ...serviceOverrides,
    };

    await TestBed.configureTestingModule({
      imports: [Coordination],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: '1' })) } },
        { provide: CoordinationService, useValue: mockService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Coordination);
    component = fixture.componentInstance;
    modal = TestBed.inject(ModalService);
    toast = TestBed.inject(ToastService);
    await fixture.whenStable();
  }

  function confirmAction(): ModalAction {
    const config = modal.modals()[0] as MessageModalConfig;
    return config.actions!.find((a) => a.variant === 'primary')!;
  }

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    await setup();
    expect(component).toBeTruthy();
  });

  describe('grouping by period', () => {
    it('always renders the three moments, chronologically, whatever the API order', async () => {
      await setup();
      expect(
        internals(component)
          .posteGroups()
          .map((g) => g.period),
      ).toEqual(['before', 'during', 'after']);
    });

    it('puts each poste under its own moment', async () => {
      await setup();
      const groups = internals(component).posteGroups();
      const byPeriod = new Map(groups.map((g) => [g.period, g.postes.map((p) => p.label)]));
      expect(byPeriod.get('before')).toEqual(['Installation']);
      expect(byPeriod.get('during')).toEqual(['Sécurité', 'Barman']);
      expect(byPeriod.get('after')).toEqual(['Vaisselle']);
    });

    /** A period with no poste at all is kept, empty and explicit: a section that
     *  vanishes reads as a bug, and "nobody on cleanup" is the very thing this
     *  screen has to make visible. */
    it('keeps a moment that has no poste at all', async () => {
      const data = baseData({
        eventJobs: [{ eventId: 1, jobId: 1, count: 1 }],
        assignments: [
          { memberId: 1, eventId: 1, jobId: 1, locked: true, pointsDelta: 10, settledAt: null },
        ],
      });
      await setup(data);

      const after = internals(component)
        .posteGroups()
        .find((g) => g.period === 'after')!;
      expect(after.postes).toEqual([]);
      expect(after.neededCount).toBe(0);
      // The one that matters: 0/0 seats left to fill is NOT "complet". A green
      // badge on a nettoyage where nobody is even expected is exactly the lie
      // this whole task exists to prevent.
      expect(after.isFull).toBe(false);
      expect(after.toFill).toBe(0);
    });

    /** The point of a per-period rate: a staffed soirée must not read as
     *  "complete" while nobody is on the cleaning. */
    it('reports a moment left unstaffed even when the others are full', async () => {
      await setup();
      const groups = internals(component).posteGroups();
      const byPeriod = new Map(groups.map((g) => [g.period, g]));

      expect(byPeriod.get('before')!.isFull).toBe(true);
      expect(byPeriod.get('during')!.isFull).toBe(true);
      expect(byPeriod.get('after')!.isFull).toBe(false);
      expect(byPeriod.get('after')!.toFill).toBe(1);
      expect(byPeriod.get('after')!.assignedCount).toBe(0);
      expect(byPeriod.get('after')!.neededCount).toBe(1);
    });
  });

  describe('member assignments', () => {
    it('lists every poste a member holds, one per moment', async () => {
      await setup();
      const member = internals(component)
        .membres()
        .find((m) => m.id === 1)!;

      expect(member.hasAssignment).toBe(true);
      expect(
        member.assignments.map(({ period, jobId, jobName, lock }) => ({
          period,
          jobId,
          jobName,
          lock,
        })),
      ).toEqual([
        { period: 'before', jobId: 3, jobName: 'Installation', lock: false },
        { period: 'during', jobId: 1, jobName: 'Barman', lock: true },
      ]);
    });

    /**
     * The constraint is one poste per member PER MOMENT (D1). Member 1 holds
     * Installation (`before`) and Barman (`during`), member 2 holds Sécurité
     * (`during`) — so the nettoyage still has both of them to offer, and the
     * soirée has nobody left.
     *
     * A single event-wide "already assigned" set would return [] on `after` and
     * make manual staffing of a second moment impossible.
     */
    it('offers a member already staffed elsewhere on a moment they are still free on', async () => {
      await setup();
      const ids = (period: JobPeriod) =>
        internals(component)
          .availableMembersFor(period)
          .map((m) => m.id);

      expect(ids('after')).toEqual([1, 2]);
      expect(ids('during')).toEqual([]);
      expect(ids('before')).toEqual([2]);
    });

    it('never offers somebody who already holds a poste on that same moment', async () => {
      await setup();
      // Member 1 is on Installation, the only `before` poste.
      expect(
        internals(component)
          .availableMembersFor('before')
          .map((m) => m.id),
      ).not.toContain(1);
    });

    it('leaves a member with no poste at all with an empty list', async () => {
      await setup(baseData({ assignments: [] }));
      const member = internals(component)
        .membres()
        .find((m) => m.id === 1)!;

      expect(member.hasAssignment).toBe(false);
      expect(member.assignments).toEqual([]);
    });
  });

  describe('error banner', () => {
    /** `loadError` used to be set on every write failure and rendered
     *  nowhere — a coordinator got no feedback at all beyond a silent no-op. */
    it('surfaces an assignment failure instead of staying silent', async () => {
      await setup(baseData(), { assign: () => throwError(() => new Error('boom')) });

      internals(component).assignMember(2, 3);
      fixture.detectChanges();

      expect(fixture.nativeElement.textContent).toContain("Erreur lors de l'affectation");
    });
  });

  describe('lock', () => {
    it('counts locked and replaceable assignments from server state', async () => {
      await setup();
      expect(internals(component).lockedCount()).toBe(1);
      expect(internals(component).replaceableCount()).toBe(2);
    });

    it('ventilates the lock counts by moment', async () => {
      await setup();
      expect(internals(component).lockBreakdown()).toEqual([
        { period: 'before', label: 'Préparation', locked: 0, replaceable: 1 },
        { period: 'during', label: 'Soirée', locked: 1, replaceable: 1 },
        { period: 'after', label: 'Nettoyage', locked: 0, replaceable: 0 },
      ]);
    });

    it('persists a lock toggle and reflects it optimistically', async () => {
      await setup();
      internals(component).toggleLock(2, 2);

      expect(setAssignmentLock).toHaveBeenCalledWith(1, 2, 2, true);
      expect(internals(component).lockedCount()).toBe(2);
      expect(internals(component).replaceableCount()).toBe(1);
    });

    /** The lock belongs to the `(member, event, job)` row, not to the member:
     *  locking the préparation must leave the soirée poste alone. */
    it('locks the targeted assignment only when a member holds several', async () => {
      await setup();
      internals(component).toggleLock(1, 3);

      expect(setAssignmentLock).toHaveBeenCalledWith(1, 1, 3, true);
      const member = internals(component)
        .membres()
        .find((m) => m.id === 1)!;
      expect(member.assignments.map((a) => [a.jobId, a.lock])).toEqual([
        [3, true],
        [1, true],
      ]);

      internals(component).toggleLock(1, 3);
      expect(setAssignmentLock).toHaveBeenLastCalledWith(1, 1, 3, false);
      expect(
        internals(component)
          .membres()
          .find((m) => m.id === 1)!
          .assignments.map((a) => [a.jobId, a.lock]),
      ).toEqual([
        [3, false],
        [1, true],
      ]);
    });

    it('rolls the lock back when the write fails', async () => {
      await setup();
      setAssignmentLock.mockReturnValue(throwError(() => new Error('boom')));

      internals(component).toggleLock(2, 2);

      expect(internals(component).lockedCount()).toBe(1);
      expect(toast.toasts().at(-1)!.title).toBe('Verrouillage impossible');
    });

    /**
     * The optimistic patch zeroes `pointsDelta` too (mirroring what
     * `setAssignmentLock` does server-side), so a failed write has to restore
     * it along with `locked` — otherwise a real credit (member 2 holds 6 on
     * job 2, cf. `baseData`) reads as `0` until the next full reload.
     */
    it('restores the points delta, not just the lock flag, when the write fails', async () => {
      await setup();
      setAssignmentLock.mockReturnValue(throwError(() => new Error('boom')));

      internals(component).toggleLock(2, 2);

      const poste = internals(component)
        .postes()
        .find((p) => p.id === 2)!;
      expect(poste.assigned.find((a) => a.id === 2)?.pointsDelta).toBe(6);
    });

    it('unlocks an already locked assignment', async () => {
      await setup();
      internals(component).toggleLock(1, 1);

      expect(setAssignmentLock).toHaveBeenCalledWith(1, 1, 1, false);
      expect(internals(component).lockedCount()).toBe(0);
    });
  });

  describe('matching run', () => {
    it('asks for confirmation and does not run the algorithm until confirmed', async () => {
      await setup();
      internals(component).confirmRunMatching();

      expect(modal.modals()).toHaveLength(1);
      const config = modal.modals()[0] as MessageModalConfig;
      expect(config.type).toBe('warning');
      expect(config.message).toContain('2 affectations non verrouillées');
      expect(config.message).toContain('1 affectation verrouillée sera conservée');
      expect(runMatching).not.toHaveBeenCalled();

      confirmAction().action();
      expect(runMatching).toHaveBeenCalledWith(1);
    });

    it('reports the run outcome through a toast', async () => {
      await setup();
      runMatching.mockReturnValue(
        of(
          summary({
            matched: [match(2, 2, 'during')],
            locked: [{ memberId: 1, jobId: 1, period: 'during' }],
          }),
        ),
      );

      internals(component).confirmRunMatching();
      confirmAction().action();
      await fixture.whenStable();

      const last = toast.toasts().at(-1)!;
      expect(last.type).toBe('success');
      expect(last.message).toContain('1 affectation verrouillée conservée');
      expect(internals(component).lastOutcome()?.tone).toBe('success');
      expect(internals(component).algoRunning()).toBe(false);
    });

    it('surfaces an all-locked run as info rather than a success toast', async () => {
      await setup();
      runMatching.mockReturnValue(
        of(summary({ locked: [{ memberId: 1, jobId: 1, period: 'during' }] })),
      );

      internals(component).confirmRunMatching();
      confirmAction().action();
      await fixture.whenStable();

      const last = toast.toasts().at(-1)!;
      expect(last.type).toBe('info');
      expect(last.title).toBe('Rien à réaffecter');
    });

    it('surfaces a wholly empty run as info rather than a success toast', async () => {
      await setup();
      internals(component).confirmRunMatching();
      confirmAction().action();
      await fixture.whenStable();

      const last = toast.toasts().at(-1)!;
      expect(last.type).toBe('info');
      expect(last.title).toBe('Rien à affecter');
    });

    it('refuses to run when the event has no job', async () => {
      await setup(baseData({ eventJobs: [], assignments: [] }));
      internals(component).confirmRunMatching();

      expect(modal.modals()).toHaveLength(0);
      expect(runMatching).not.toHaveBeenCalled();
      expect(toast.toasts().at(-1)!.title).toBe('Aucun poste à pourvoir');
    });

    it('refuses to run when nobody is available', async () => {
      await setup(baseData({ responses: [], assignments: [] }));
      internals(component).confirmRunMatching();

      expect(modal.modals()).toHaveLength(0);
      expect(runMatching).not.toHaveBeenCalled();
      expect(toast.toasts().at(-1)!.title).toBe('Aucun membre disponible');
    });

    it('reports a failed run without touching the local assignments', async () => {
      await setup();
      runMatching.mockReturnValue(throwError(() => new Error('boom')));

      internals(component).confirmRunMatching();
      confirmAction().action();
      await fixture.whenStable();

      expect(toast.toasts().at(-1)!.type).toBe('error');
      expect(internals(component).algoRunning()).toBe(false);
      expect(internals(component).lockedCount()).toBe(1);
    });
  });

  describe('settled soirée', () => {
    function settledData(): CoordinationApiData {
      return baseData({
        assignments: baseData().assignments.map((a) => ({
          ...a,
          settledAt: '2026-01-01T00:00:00.000Z',
        })),
      });
    }

    it('knows the soirée is settled before trying', async () => {
      await setup(settledData());
      expect(internals(component).isSettled()).toBe(true);
    });

    it('refuses to run and explains why rather than burning a 409', async () => {
      await setup(settledData());
      internals(component).confirmRunMatching();

      expect(modal.modals()).toHaveLength(0);
      expect(runMatching).not.toHaveBeenCalled();
      const last = toast.toasts().at(-1)!;
      expect(last.title).toBe('Soirée déjà clôturée');
      expect(last.message).toContain('consolidés');
    });

    /** Another tab may have closed the soirée between the page load and the
     *  click: the 409 still has to be worded, not swallowed. */
    it('words a 409 raised while the modal was open', async () => {
      await setup();
      runMatching.mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { code: 'E_EVENT_ALREADY_SETTLED', message: 'Event already settled' },
            }),
        ),
      );

      internals(component).confirmRunMatching();
      confirmAction().action();
      await fixture.whenStable();

      const last = toast.toasts().at(-1)!;
      expect(last.type).toBe('error');
      expect(last.message).toContain('consolidés');
      expect(internals(component).algoRunning()).toBe(false);
    });

    /**
     * `validateAssignments()` has no endpoint behind it yet (the panel is
     * ahead of the backend, on purpose). It must never claim a write
     * happened — least of all right under the "Soirée clôturée" banner.
     */
    it('never tells the user a validation succeeded: no write exists', async () => {
      await setup();
      internals(component).validateAssignments();

      expect(toast.toasts().at(-1)!.type).not.toBe('success');
    });

    it('names the soirée as already settled instead of a fake success', async () => {
      await setup(settledData());
      internals(component).validateAssignments();

      const last = toast.toasts().at(-1)!;
      expect(last.type).not.toBe('success');
      expect(last.title).toBe('Soirée déjà clôturée');
    });
  });
});
