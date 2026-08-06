import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { Coordination, buildEventsData, describeMatching } from './coordination';
import {
  CoordinationService,
  type ApiMatchingSummary,
  type CoordinationApiData,
} from '#core/services/coordination/coordination-service';
import { ModalService } from '#shared/components/modal/modal.service';
import { ToastService } from '#shared/components/toast/toast.service';
import type { ModalAction, MessageModalConfig } from '#shared/components/modal/modal.models';

/** The page exposes its behaviour as `protected` members; the specs drive them
 *  through this narrow view instead of casting to `any` at each call site. */
interface CoordinationInternals {
  confirmRunMatching(): void;
  toggleLock(memberId: number, roleId: number): void;
  lockedCount(): number;
  replaceableCount(): number;
  algoRunning(): boolean;
  lastOutcome(): { tone: string; title: string; message: string } | null;
  postes(): { id: number; assigned: { id: number; lock: boolean; pointsDelta: number }[] }[];
  membres(): { id: number; lock: boolean; pointsDelta: number; poste: string }[];
}

function internals(component: Coordination): CoordinationInternals {
  return component as unknown as CoordinationInternals;
}

function summary(overrides: Partial<ApiMatchingSummary> = {}): ApiMatchingSummary {
  return { matched: [], unmatchedMemberIds: [], locked: [], ...overrides };
}

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
      { id: 1, name: 'Barman' },
      { id: 2, name: 'Sécurité' },
    ],
    eventJobs: [
      { eventId: 1, jobId: 1, count: 1 },
      { eventId: 1, jobId: 2, count: 1 },
    ],
    assignments: [
      { memberId: 1, eventId: 1, jobId: 1, locked: true, pointsDelta: 10 },
      { memberId: 2, eventId: 1, jobId: 2, locked: false, pointsDelta: 6 },
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
  it('reports a full success when everybody was placed', () => {
    const outcome = describeMatching(
      summary({ matched: [{ memberId: 1, jobId: 1, rankAchieved: 1, pointsDelta: 10 }] }),
    );
    expect(outcome.tone).toBe('success');
    expect(outcome.message).toContain('1 affectation générée');
  });

  it('mentions preserved locked rows in the success message', () => {
    const outcome = describeMatching(
      summary({
        matched: [
          { memberId: 1, jobId: 1, rankAchieved: 1, pointsDelta: 10 },
          { memberId: 3, jobId: 1, rankAchieved: 2, pointsDelta: 8 },
        ],
        locked: [{ memberId: 2, jobId: 2 }],
      }),
    );
    expect(outcome.tone).toBe('success');
    expect(outcome.message).toContain('2 affectations générées');
    expect(outcome.message).toContain('1 affectation verrouillée conservée');
  });

  it('degrades to a warning when some members stayed unmatched', () => {
    const outcome = describeMatching(
      summary({
        matched: [{ memberId: 1, jobId: 1, rankAchieved: 1, pointsDelta: 10 }],
        unmatchedMemberIds: [2, 3],
      }),
    );
    expect(outcome.tone).toBe('warning');
    expect(outcome.title).toBe('Affectation partielle');
    expect(outcome.message).toContain('2 membres non affectés');
  });

  it('never claims success when nothing was matched and members were left out', () => {
    const outcome = describeMatching(summary({ unmatchedMemberIds: [1, 2] }));
    expect(outcome.tone).toBe('warning');
    expect(outcome.title).toBe('Aucune affectation générée');
  });

  it('explains that every seat is already locked', () => {
    const outcome = describeMatching(summary({ locked: [{ memberId: 1, jobId: 1 }] }));
    expect(outcome.tone).toBe('info');
    expect(outcome.title).toBe('Rien à réaffecter');
    expect(outcome.message).toContain('1 affectation verrouillée conservée');
  });

  it('reports an empty run as info, not success', () => {
    const outcome = describeMatching(summary());
    expect(outcome.tone).toBe('info');
    expect(outcome.title).toBe('Rien à affecter');
  });
});

describe('buildEventsData', () => {
  it('carries the server lock flag and points delta onto each assignment', () => {
    const [eventData] = buildEventsData(baseData(), new Set());
    const barman = eventData.roles.find((r) => r.id === 1)!;
    expect(barman.assigned).toEqual([{ memberId: 1, locked: true, pointsDelta: 10 }]);
  });

  it('marks a job restricted only when it has eligibility rows', () => {
    const [eventData] = buildEventsData(baseData(), new Set([2]));
    expect(eventData.roles.find((r) => r.id === 1)!.restricted).toBe(false);
    expect(eventData.roles.find((r) => r.id === 2)!.restricted).toBe(true);
  });
});

describe(Coordination.name, () => {
  let component: Coordination;
  let fixture: ComponentFixture<Coordination>;
  let modal: ModalService;
  let toast: ToastService;
  let runMatching: ReturnType<typeof vi.fn>;
  let setAssignmentLock: ReturnType<typeof vi.fn>;

  async function setup(data: CoordinationApiData = baseData()): Promise<void> {
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

  it('counts locked and replaceable assignments from server state', async () => {
    await setup();
    expect(internals(component).lockedCount()).toBe(1);
    expect(internals(component).replaceableCount()).toBe(1);
  });

  it('asks for confirmation and does not run the algorithm until confirmed', async () => {
    await setup();
    internals(component).confirmRunMatching();

    expect(modal.modals()).toHaveLength(1);
    const config = modal.modals()[0] as MessageModalConfig;
    expect(config.type).toBe('warning');
    expect(config.message).toContain('1 affectation non verrouillée');
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
          matched: [{ memberId: 2, jobId: 2, rankAchieved: 1, pointsDelta: 10 }],
          locked: [{ memberId: 1, jobId: 1 }],
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
    runMatching.mockReturnValue(of(summary({ locked: [{ memberId: 1, jobId: 1 }] })));

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

  it('persists a lock toggle and reflects it optimistically', async () => {
    await setup();
    internals(component).toggleLock(2, 2);

    expect(setAssignmentLock).toHaveBeenCalledWith(1, 2, 2, true);
    expect(internals(component).lockedCount()).toBe(2);
    expect(internals(component).replaceableCount()).toBe(0);
  });

  it('rolls the lock back when the write fails', async () => {
    await setup();
    setAssignmentLock.mockReturnValue(throwError(() => new Error('boom')));

    internals(component).toggleLock(2, 2);

    expect(internals(component).lockedCount()).toBe(1);
    expect(toast.toasts().at(-1)!.title).toBe('Verrouillage impossible');
  });

  it('unlocks an already locked assignment', async () => {
    await setup();
    internals(component).toggleLock(1, 1);

    expect(setAssignmentLock).toHaveBeenCalledWith(1, 1, 1, false);
    expect(internals(component).lockedCount()).toBe(0);
  });
});
