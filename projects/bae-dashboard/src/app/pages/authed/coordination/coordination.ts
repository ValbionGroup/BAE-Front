import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  computed,
  effect,
  inject,
  OnInit,
  signal,
  TemplateRef,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { Observable, catchError, finalize, forkJoin, map, of, switchMap } from 'rxjs';
import {
  LucideDynamicIcon,
  LucideIconInput,
  LucidePlus,
  LucideX,
  LucideCheck,
  LucideUsers,
  LucideFlame,
  LucideWine,
  LucideCreditCard,
  LucideShield,
  LucideMusic,
  LucideSmile,
  LucideSettings,
  LucideZap,
  LucideLock,
  LucideLockOpen,
  LucideEllipsisVertical,
  LucideDownload,
} from '@lucide/angular';
import {
  CoordinationService,
  type ApiJob,
  type ApiMatchingSummary,
  type ApiPreference,
  type CoordinationApiData,
} from '#core/services/coordination/coordination-service';
import { CoordinationStore } from '#core/store/coordination.store';
import {
  JOB_PERIODS,
  JOB_PERIOD_LABELS,
  JOB_PERIOD_SHORT_LABELS,
  isJobPeriod,
  type JobPeriod,
} from '#core/models/job-period.model';
import { isApiError, DropdownService, Btn, Badge, Avatar, ToastService } from '@bae/ui';
import type { DropdownItemAction, ToastType } from '@bae/ui';
import { ModalService } from '#shared/components/modal/modal.service';
import type { RoleModalRole } from '#shared/components/modal/modal.models';
import { PageHeaderService } from '#core/services/page-header/page-header-service.js';
import { PrintService } from '#core/services/print/print-service';
import { formatPointsDelta as sharedFormatPointsDelta } from '#shared/utils/points-delta';
import { teamMemberName } from '#core/services/team/team-service';

interface Member {
  id: number;
  /** Déjà assemblé par `teamMemberName` : l'identité vit sous `user` côté API. */
  name: string;
  role: string;
  points: number;
}

/**
 * One `member_event_assigned_jobs` row, from the point of view of the job it
 * belongs to. `locked` is server state, not a local UI preference: the
 * matching engine reads it to decide what it may overwrite.
 */
export interface AssignedMember {
  memberId: number;
  locked: boolean;
  pointsDelta: number;
  /** Non-null once the soirée's points have been folded into `members.points`.
   *  Read as a whole-event flag through `EventData.settled`. */
  settledAt: string | null;
}

export interface Role {
  id: number;
  name: string;
  /** Which moment of the soirée this poste belongs to, read from `jobs.type`. */
  period: JobPeriod;
  icon: LucideIconInput;
  requiredCount: number;
  /** `true` when the job has at least one `job_eligible_members` row, i.e. it
   *  is NOT open to everyone. */
  restricted: boolean;
  assigned: AssignedMember[];
}

export interface SoireeEvent {
  id: number;
  name: string;
  date: Date;
}

export interface EventData {
  event: SoireeEvent;
  presentMemberIds: number[];
  roles: Role[];
  /**
   * `true` when at least one assignment carries a `settledAt`: the soirée's
   * points are consolidated, and `POST /events/:id/matching` on it answers
   * 409 `E_EVENT_ALREADY_SETTLED`.
   */
  settled: boolean;
}

interface AssignedMemberView {
  id: number;
  name: string;
  lock: boolean;
  lockPending: boolean;
  score: number;
  pointsDelta: number;
}

interface PosteView {
  id: number;
  label: string;
  period: JobPeriod;
  color: string;
  icon: LucideIconInput;
  need: number;
  restricted: boolean;
  assigned: AssignedMemberView[];
}

/** One moment of the soirée and everything staffed on it. */
interface PeriodGroupView {
  period: JobPeriod;
  label: string;
  postes: PosteView[];
  assignedCount: number;
  neededCount: number;
  toFill: number;
  /**
   * Coverage is per moment on purpose: a soirée over-staffed at the bar while
   * nobody is on the rangement is NOT complete, and a global rate would say it
   * is.
   */
  isFull: boolean;
}

/** Locked vs replaceable rows, for one moment of the soirée. */
interface PeriodLockView {
  period: JobPeriod;
  label: string;
  locked: number;
  replaceable: number;
}

/**
 * One `member_event_assigned_jobs` row seen from the member. A member holds at
 * most one poste per period (D1), so a member has between zero and three of
 * these — and the lock belongs to the row, never to the member.
 */
interface MemberAssignmentView {
  period: JobPeriod;
  /** Full wording, for the lock button's accessible name. */
  periodLabel: string;
  jobId: number;
  jobName: string;
  lock: boolean;
  lockPending: boolean;
}

/**
 * One moment of the soirée for one member, held or not. The three of them are
 * always rendered so the column can tell "pas de poste sur ce moment" apart
 * from "pas de poste du tout".
 */
interface MemberSlotView {
  period: JobPeriod;
  /** Compact wording, for the narrow table column. */
  shortLabel: string;
  assignment: MemberAssignmentView | null;
}

interface MemberView {
  id: number;
  name: string;
  /** Postes held on the selected soirée, in chronological order. Empty when the
   *  member holds none — never their BAE function, which says what they are in
   *  the association, not what they are doing tonight. */
  assignments: MemberAssignmentView[];
  /** `false` when the member holds no poste at all on this soirée. */
  hasAssignment: boolean;
  /** Names of the postes held, to highlight the matching preference chips. */
  assignedJobNames: string[];
  score: number;
  pointsDelta: number;
  preferences: string[];
  isPresent: boolean;
}

/** Outcome of a matching run, rendered identically by the toast and the banner. */
export interface MatchingOutcome {
  tone: ToastType;
  title: string;
  message: string;
}

const POSTE_COLORS = ['blue', 'emerald', 'amber', 'rose', 'indigo', 'teal'];

const JOB_ICONS: Record<string, LucideIconInput> = {
  Barman: LucideWine,
  Caissier: LucideCreditCard,
  Serveur: LucideSmile,
  Sécurité: LucideShield,
  Logistique: LucideFlame,
  Sono: LucideMusic,
};

/** French agreement: 0 and 1 take the singular form. */
function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count > 1 ? pluralForm : singular}`;
}

/**
 * The moment a poste belongs to, tolerant of a value this build does not know.
 *
 * `jobs.type` has no database check constraint: a server-side enum that grew
 * past this client would otherwise land a poste in no group at all, i.e. make
 * it silently disappear from the screen. Falling back on the soirée itself
 * keeps it visible and staffable.
 */
function periodOf(job: { type: string }): JobPeriod {
  return isJobPeriod(job.type) ? job.type : 'during';
}

/** `{ before: 0, during: 0, after: 0 }`, ready to be counted into. */
function emptyPeriodCounts(): Record<JobPeriod, number> {
  return { before: 0, during: 0, after: 0 };
}

/**
 * "3 en préparation · 12 en soirée · 0 en nettoyage".
 *
 * Every moment is named, including those nobody was placed on: a zero on the
 * nettoyage is the single most useful number this screen can print, so it is
 * never omitted. The wording comes from `JOB_PERIOD_LABELS` — the period
 * vocabulary is declared once, in `core/models/job-period.model.ts`.
 */
function describePeriodCounts(counts: Record<JobPeriod, number>): string {
  return JOB_PERIODS.map(
    (period) => `${counts[period]} en ${JOB_PERIOD_LABELS[period].toLowerCase()}`,
  ).join(' · ');
}

/**
 * `restrictedJobIds` holds the jobs that have at least one
 * `job_eligible_members` row. A job absent from that set is unrestricted —
 * absence means "open to everyone", never "nobody is eligible".
 */
export function buildEventsData(
  raw: CoordinationApiData,
  restrictedJobIds: ReadonlySet<number>,
): EventData[] {
  return raw.events.map((event) => ({
    event: { id: event.id, name: event.name, date: new Date(event.date) },
    presentMemberIds: raw.responses
      .filter((r) => r.eventId === event.id && r.isAvailable)
      .map((r) => r.memberId),
    settled: raw.assignments.some((a) => a.eventId === event.id && a.settledAt !== null),
    roles: raw.eventJobs
      .filter((ej) => ej.eventId === event.id)
      .map((ej) => {
        const job = raw.jobs.find((j) => j.id === ej.jobId)!;
        return {
          id: ej.jobId,
          name: job.name,
          period: periodOf(job),
          icon: JOB_ICONS[job.name] ?? LucideUsers,
          requiredCount: ej.count,
          restricted: restrictedJobIds.has(ej.jobId),
          assigned: raw.assignments
            .filter((a) => a.eventId === event.id && a.jobId === ej.jobId)
            .map((a) => ({
              memberId: a.memberId,
              locked: a.locked,
              pointsDelta: a.pointsDelta,
              settledAt: a.settledAt,
            })),
        };
      }),
  }));
}

/**
 * Turn a failed `POST /events/:id/matching` into wording the user can act on.
 *
 * `HttpErrorResponse.error` is already unwrapped to `{ code, message }` by
 * `apiEnvelopeInterceptor`. An unknown code keeps the API's own sentence
 * rather than a hard-coded one that would hide what actually happened.
 */
export function matchingErrorMessage(error: unknown): string {
  const body = error instanceof HttpErrorResponse ? error.error : null;
  if (isApiError(body)) {
    if (body.code === 'E_EVENT_ALREADY_SETTLED') {
      return "Points consolidés : l'affectation automatique est indisponible.";
    }
    return body.message;
  }
  return "L'algorithme n'a pas pu être exécuté. Les affectations sont inchangées.";
}

/**
 * Turn a matching summary into something the user can act on.
 *
 * The engine happily returns an empty `matched` when the event has no job,
 * nobody answered available, or every seat is already held by a locked row —
 * those must NOT read as a success, so the tone degrades to `info`/`warning`
 * and the message names the reason instead of claiming work happened.
 *
 * A member left out is no longer a matter of taste: preferences are implicitly
 * complete (D2, every unranked poste is ex æquo last), so the rankings never
 * keep anybody out. But the engine ALSO filters candidates through
 * `job_eligible_members`, so "left out" does not reduce to "no seat left"
 * either: a restricted poste can sit half empty next to somebody who is simply
 * not allowed on it.
 *
 * The wording therefore states only what is always true — no free seat was
 * OPEN to them — and `hasRestrictedJobs` decides whether the remedy mentions
 * eligibility. Telling somebody to add postes when the real blocker is an
 * eligibility list sends them fixing the wrong thing.
 */
export function describeMatching(
  summary: ApiMatchingSummary,
  hasRestrictedJobs = false,
): MatchingOutcome {
  const matched = summary.matched.length;
  const unmatched = summary.unmatchedMemberIds.length;
  const locked = summary.locked.length;

  const byPeriod = emptyPeriodCounts();
  for (const row of summary.matched) {
    if (isJobPeriod(row.period)) byPeriod[row.period] += 1;
  }

  const matchedPart = plural(matched, 'affectation générée', 'affectations générées');
  const lockedPart = plural(
    locked,
    'affectation verrouillée conservée',
    'affectations verrouillées conservées',
  );
  const shortagePart = plural(
    unmatched,
    'membre disponible est resté sans poste',
    'membres disponibles sont restés sans poste',
  );
  const noSeatOpen =
    unmatched > 1
      ? 'aucune place libre ne leur était ouverte'
      : 'aucune place libre ne lui était ouverte';
  const fix = hasRestrictedJobs
    ? 'Un poste à éligibilité restreinte peut rester vide faute de personne autorisée.'
    : 'Ajoutez des postes ou augmentez les effectifs.';

  if (matched === 0) {
    if (unmatched > 0) {
      const reason = locked > 0 ? `${noSeatOpen} — ${lockedPart}` : noSeatOpen;
      return {
        tone: 'warning',
        title: 'Aucune affectation générée',
        message: `${shortagePart} : ${reason}. ${fix}`,
      };
    }
    if (locked > 0) {
      return {
        tone: 'info',
        title: 'Rien à réaffecter',
        message: `Aucune modification : ${lockedPart}, et plus aucun membre disponible à placer.`,
      };
    }
    return {
      tone: 'info',
      title: 'Rien à affecter',
      message: 'Aucun membre disponible sur cette soirée.',
    };
  }

  const breakdown = describePeriodCounts(byPeriod);
  const lockedSuffix = locked > 0 ? ` · ${lockedPart}` : '';

  if (unmatched > 0) {
    return {
      tone: 'warning',
      // Names the fact, not a cause: the title used to read "Postes en nombre
      // insuffisant", which is one of two possible explanations, not the one
      // the summary establishes.
      title: 'Des membres sont restés sans poste',
      message: `${matchedPart} (${breakdown})${lockedSuffix}. ${shortagePart} : ${noSeatOpen}. ${fix}`,
    };
  }

  return {
    tone: 'success',
    title: 'Affectation automatique terminée',
    message: `${matchedPart} (${breakdown}) · tous les membres disponibles ont un poste${lockedSuffix}.`,
  };
}

function findNextEventId(events: EventData[]): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = events.find((ed) => ed.event.date >= today);
  return next?.event.id ?? events.at(-1)?.event.id ?? null;
}

function assignmentKey(eventId: number, jobId: number, memberId: number): string {
  return `${eventId}:${jobId}:${memberId}`;
}

@Component({
  selector: 'bfd-coordination',
  imports: [Btn, Badge, Avatar, LucideDynamicIcon],
  templateUrl: './coordination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Coordination implements OnInit {
  private readonly svc = inject(CoordinationService);
  private readonly store = inject(CoordinationStore);
  private readonly pageHeader = inject(PageHeaderService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly icSettings = LucideSettings;
  protected readonly icZap = LucideZap;
  protected readonly icCheck = LucideCheck;
  protected readonly icX = LucideX;
  protected readonly icLock = LucideLock;
  protected readonly icLockOpen = LucideLockOpen;
  protected readonly icPlus = LucidePlus;
  protected readonly icMore = LucideEllipsisVertical;
  protected readonly icDownload = LucideDownload;

  protected readonly dropdown = inject(DropdownService);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);
  private readonly printService = inject(PrintService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly allMembers = signal<Member[]>([]);
  protected readonly eventsData = signal<EventData[]>([]);
  protected readonly selectedEventId = signal<number | null>(null);
  protected readonly algoRunning = signal(false);
  protected readonly algoRunAt = signal<Date | null>(null);
  protected readonly lastOutcome = signal<MatchingOutcome | null>(null);

  /** Assignment keys whose lock write is still in flight. */
  private readonly lockPending = signal<ReadonlySet<string>>(new Set());

  private readonly routeEventId = signal<number | null>(null);
  private readonly jobsById = signal<Map<number, ApiJob>>(new Map());
  private readonly preferences = signal<ApiPreference[]>([]);
  /** Jobs narrowed by `job_eligible_members`; fetched once, they only change
   *  from an admin screen that does not exist yet. */
  private readonly restrictedJobIds = signal<ReadonlySet<number>>(new Set<number>());

  constructor() {
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
    effect(() => {
      const eventData = this.selectedEventData();
      const presentCount = this.presentMembers().length;
      this.updateHeader(eventData ?? null, presentCount);
    });
  }

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const rawId = params.get('id');
      const parsed = rawId ? Number(rawId) : null;
      const nextId = Number.isFinite(parsed) ? parsed : null;
      this.routeEventId.set(nextId);
      if (nextId !== null) {
        this.selectedEventId.set(nextId);
      }
    });
    this.loadCoordinationData();
  }

  protected readonly selectedEventData = computed(() =>
    this.eventsData().find((ed) => ed.event.id === this.selectedEventId()),
  );

  protected readonly presentMembers = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    return this.allMembers().filter((m) => eventData.presentMemberIds.includes(m.id));
  });

  /**
   * Who is already taken, moment by moment. The constraint is one poste per
   * member PER PERIOD (D1) — somebody on the installation is still free for
   * the service, so a single event-wide set would wrongly hide them.
   */
  protected readonly assignedMemberIdsByPeriod = computed(() => {
    const byPeriod = new Map<JobPeriod, Set<number>>(
      JOB_PERIODS.map((period) => [period, new Set<number>()] as const),
    );
    for (const role of this.selectedEventData()?.roles ?? []) {
      const ids = byPeriod.get(role.period)!;
      for (const a of role.assigned) ids.add(a.memberId);
    }
    return byPeriod;
  });

  protected availableMembersFor(period: JobPeriod): Member[] {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    const assigned = this.assignedMemberIdsByPeriod().get(period) ?? new Set<number>();
    return this.allMembers().filter(
      (m) => eventData.presentMemberIds.includes(m.id) && !assigned.has(m.id),
    );
  }

  /**
   * The soirée's points are consolidated: `POST /events/:id/matching` on it
   * answers 409 `E_EVENT_ALREADY_SETTLED`. Known before the click, so the
   * action is disabled with its reason instead of failing.
   */
  protected readonly isSettled = computed(() => this.selectedEventData()?.settled ?? false);

  /**
   * At least one poste of the soirée has `job_eligible_members` rows. When it
   * does, a member can stay unplaced with a seat still free — on a poste they
   * are not allowed on — so the run's wording must offer that explanation too.
   */
  protected readonly hasRestrictedJobs = computed(
    () => this.selectedEventData()?.roles.some((role) => role.restricted) ?? false,
  );

  /**
   * Locked vs replaceable rows, moment by moment. A global count hides which
   * part of the soirée the next run is about to redo.
   */
  protected readonly lockBreakdown = computed<PeriodLockView[]>(() => {
    const eventData = this.selectedEventData();
    const counts = new Map<JobPeriod, { locked: number; replaceable: number }>(
      JOB_PERIODS.map((period) => [period, { locked: 0, replaceable: 0 }] as const),
    );

    for (const role of eventData?.roles ?? []) {
      const bucket = counts.get(role.period)!;
      for (const a of role.assigned) {
        if (a.locked) bucket.locked += 1;
        else bucket.replaceable += 1;
      }
    }

    return JOB_PERIODS.map((period) => ({
      period,
      label: JOB_PERIOD_LABELS[period],
      ...counts.get(period)!,
    }));
  });

  /** Rows the next matching run would preserve. */
  protected readonly lockedCount = computed(() =>
    this.lockBreakdown().reduce((sum, group) => sum + group.locked, 0),
  );

  /** Rows the next matching run would delete and regenerate. */
  protected readonly replaceableCount = computed(() =>
    this.lockBreakdown().reduce((sum, group) => sum + group.replaceable, 0),
  );

  private readonly memberById = computed(
    () => new Map(this.allMembers().map((member) => [member.id, member] as const)),
  );

  private readonly preferenceByMember = computed(() => {
    const map = new Map<number, Map<number, number>>();
    for (const pref of this.preferences()) {
      if (!map.has(pref.memberId)) {
        map.set(pref.memberId, new Map());
      }
      map.get(pref.memberId)!.set(pref.jobId, pref.preferenceRank);
    }
    return map;
  });

  protected readonly postes = computed<PosteView[]>(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    const members = this.memberById();
    const pending = this.lockPending();

    return eventData.roles.map((role, index) => ({
      id: role.id,
      label: role.name,
      period: role.period,
      color: POSTE_COLORS[index % POSTE_COLORS.length],
      icon: role.icon,
      need: role.requiredCount,
      restricted: role.restricted,
      assigned: role.assigned.map((a) => {
        const member = members.get(a.memberId);
        return {
          id: a.memberId,
          name: member?.name ?? `#${a.memberId}`,
          lock: a.locked,
          lockPending: pending.has(assignmentKey(eventData.event.id, role.id, a.memberId)),
          score: member?.points ?? 0,
          pointsDelta: a.pointsDelta,
        };
      }),
    }));
  });

  /**
   * The postes of the soirée, grouped by moment, in chronological order.
   *
   * The three moments are ALWAYS present, including one with no poste at all:
   * a section that silently disappears reads as a bug, and "nobody is on the
   * nettoyage" is precisely what this screen exists to show. The empty section
   * says so in words instead of vanishing.
   */
  protected readonly posteGroups = computed<PeriodGroupView[]>(() => {
    const postes = this.postes();

    return JOB_PERIODS.map((period) => {
      const own = postes.filter((p) => p.period === period);
      const assignedCount = own.reduce((sum, p) => sum + p.assigned.length, 0);
      const neededCount = own.reduce((sum, p) => sum + p.need, 0);
      const toFill = own.reduce((sum, p) => sum + this.toFill(p), 0);

      return {
        period,
        label: JOB_PERIOD_LABELS[period],
        postes: own,
        assignedCount,
        neededCount,
        toFill,
        // A moment with no poste is not "full": there is nothing to be full of,
        // and the template says that in its own words.
        isFull: own.length > 0 && toFill === 0,
      };
    });
  });

  protected readonly membres = computed<MemberView[]>(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    const pending = this.lockPending();
    // Chronological, so a member's postes always read préparation → nettoyage
    // whatever order `event_jobs` came back in.
    const periodRank = new Map(JOB_PERIODS.map((period, index) => [period, index] as const));

    const views = this.allMembers().map((member) => {
      // Every poste this member holds on THIS soirée — at most one per moment
      // (D1). Never their BAE function: a member's role (Trésorerie,
      // Logistique…) says what they are in the association, not what they are
      // doing tonight, and falling back to it made unassigned members look
      // staffed.
      const assignments: MemberAssignmentView[] = eventData.roles
        .flatMap((role) => {
          const assignment = role.assigned.find((a) => a.memberId === member.id);
          if (!assignment) return [];
          return [
            {
              period: role.period,
              periodLabel: JOB_PERIOD_LABELS[role.period],
              jobId: role.id,
              jobName: role.name,
              lock: assignment.locked,
              lockPending: pending.has(assignmentKey(eventData.event.id, role.id, member.id)),
            },
          ];
        })
        .sort((a, b) => periodRank.get(a.period)! - periodRank.get(b.period)!);

      return {
        id: member.id,
        name: member.name,
        assignments,
        hasAssignment: assignments.length > 0,
        assignedJobNames: assignments.map((a) => a.jobName),
        score: member.points,
        // The soirée total: one delta per assignment (D5), and it may be
        // negative for a member served on their first choice everywhere.
        pointsDelta: eventData.roles.reduce(
          (sum, role) =>
            sum + (role.assigned.find((a) => a.memberId === member.id)?.pointsDelta ?? 0),
          0,
        ),
        preferences: this.buildPreferences(member, eventData),
        isPresent: eventData.presentMemberIds.includes(member.id),
      };
    });

    return views.sort((a, b) => Number(b.isPresent) - Number(a.isPresent));
  });

  /**
   * The three moments of one member, held or not.
   *
   * Rendering the empty ones is the whole point: an absent line would blur
   * "this member has nothing on the nettoyage" into "this member has nothing at
   * all", and only the second one calls for staffing them somewhere.
   */
  protected periodSlots(member: MemberView): MemberSlotView[] {
    return JOB_PERIODS.map((period) => ({
      period,
      shortLabel: JOB_PERIOD_SHORT_LABELS[period],
      assignment: member.assignments.find((a) => a.period === period) ?? null,
    }));
  }

  protected formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected assignMember(memberId: number, roleId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;

    this.patchRole(eventId, roleId, (assigned) =>
      assigned.some((a) => a.memberId === memberId)
        ? assigned
        : [...assigned, { memberId, locked: false, pointsDelta: 0, settledAt: null }],
    );

    this.svc.assign(eventId, memberId, roleId).subscribe({
      error: () => this.loadError.set("Erreur lors de l'affectation."),
    });
  }

  protected removeAssignment(memberId: number, roleId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;
    if (this.isLocked(roleId, memberId)) return;

    this.patchRole(eventId, roleId, (assigned) => assigned.filter((a) => a.memberId !== memberId));

    this.svc.unassign(eventId, memberId, roleId).subscribe({
      error: () => this.loadError.set('Erreur lors de la suppression.'),
    });
  }

  protected openRolesModal(): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;

    this.modal.open({
      type: 'roles',
      title: 'Configurer les postes de la soirée',
      // Devient le sous-titre de la coquille : une ligne, pas deux. La seconde
      // phrase — les postes se créent depuis l'administration — est déjà dite
      // par le bandeau de la modale, à l'endroit où elle devient utile.
      message: 'Choisissez les postes à armer et le nombre de personnes par poste.',
      roles: eventData.roles.map((role) => ({
        jobId: role.id,
        requiredCount: role.requiredCount,
      })),
      availableJobs: [...this.jobsById().values()]
        .map((job) => ({ id: job.id, name: job.name, period: periodOf(job) }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      onSave: (roles: RoleModalRole[]) => this.saveRoleEdits(eventData.event.id, roles),
    });
  }

  protected openRoleDropdown(anchor: HTMLElement, poste: PosteView): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;

    // Only members still free on THIS moment: being on the installation does
    // not disqualify somebody from the service.
    const members = this.availableMembersFor(poste.period);
    const items: DropdownItemAction[] = members.map((m) => ({
      type: 'action',
      label: m.name,
      description: m.role,
      onClick: () => this.assignMember(m.id, poste.id),
    }));

    this.dropdown.toggle({
      anchor,
      items,
      header: `Affecter un membre · ${JOB_PERIOD_LABELS[poste.period]}`,
      emptyLabel: 'Aucun membre disponible sur ce moment',
    });
  }

  /**
   * Entry point of the server-side stable-matching engine.
   *
   * The run deletes every NON-locked assignment of the event before writing
   * new ones, so it always goes through a confirmation modal. The degenerate
   * cases that cannot possibly produce anything are caught here rather than
   * burning a destructive round trip.
   */
  protected confirmRunMatching(): void {
    const eventData = this.selectedEventData();
    if (!eventData || this.algoRunning() || this.loading()) return;

    if (eventData.roles.length === 0) {
      this.toast.show({
        type: 'warning',
        title: 'Aucun poste à pourvoir',
        message: `« ${eventData.event.name} » n'a aucun poste. Ajoutez-en via « Postes » avant de lancer l'affectation.`,
      });
      return;
    }

    if (eventData.presentMemberIds.length === 0) {
      this.toast.show({
        type: 'warning',
        title: 'Aucun membre disponible',
        message: `Personne ne s'est déclaré disponible pour « ${eventData.event.name} » : l'algorithme n'aurait personne à placer.`,
      });
      return;
    }

    // Known from `settledAt`: the server would answer 409
    // `E_EVENT_ALREADY_SETTLED`. Say so instead of spending the round trip —
    // the button is already disabled, this catches the keyboard path.
    if (eventData.settled) {
      this.toast.show({
        type: 'info',
        title: 'Soirée déjà clôturée',
        message: `Points de « ${eventData.event.name} » consolidés : affectation automatique indisponible.`,
      });
      return;
    }

    const locked = this.lockedCount();
    const replaceable = this.replaceableCount();
    const lockedSentence =
      locked > 0
        ? `${plural(locked, 'affectation verrouillée sera conservée', 'affectations verrouillées seront conservées')} à l'identique.`
        : "Aucune affectation n'est verrouillée : tout sera recalculé. Verrouillez d'abord les affectations à préserver.";

    this.modal.open({
      type: 'warning',
      title: "Lancer l'affectation automatique ?",
      message:
        `${plural(replaceable, 'affectation non verrouillée', 'affectations non verrouillées')} de ` +
        `« ${eventData.event.name} » ${replaceable > 1 ? 'seront supprimées puis recalculées' : 'sera supprimée puis recalculée'} ` +
        `par l'algorithme. ${lockedSentence} Cette action est irréversible.`,
      actions: [
        { label: 'Annuler', action: () => undefined, variant: 'secondary' },
        {
          label: "Lancer l'affectation",
          action: () => this.runMatching(eventData.event.id),
          variant: 'primary',
        },
      ],
    });
  }

  private runMatching(eventId: number): void {
    this.algoRunning.set(true);
    this.loadError.set(null);

    this.svc
      .runMatching(eventId)
      .pipe(
        switchMap((summary) => this.svc.loadAll().pipe(map((raw) => ({ summary, raw }) as const))),
        catchError((error: unknown) => {
          const message = matchingErrorMessage(error);
          this.loadError.set(message);
          this.toast.show({
            type: 'error',
            title: "Échec de l'affectation automatique",
            message,
          });
          // Re-sync rather than stop here: a 409 means another tab settled the
          // soirée while this one had the modal open, and the page has to start
          // showing that instead of offering a run that can no longer happen.
          return this.svc.loadAll().pipe(
            map((raw) => ({ summary: null, raw }) as const),
            catchError(() => of(null)),
          );
        }),
        finalize(() => this.algoRunning.set(false)),
      )
      .subscribe((result) => {
        if (!result) return;
        this.applyLoadedData(result.raw);
        if (!result.summary) return;
        this.algoRunAt.set(new Date());

        // Read AFTER `applyLoadedData`, so the flag reflects the soirée the run
        // actually operated on.
        const outcome = describeMatching(result.summary, this.hasRestrictedJobs());
        this.lastOutcome.set(outcome);
        this.toast.show({
          type: outcome.tone,
          title: outcome.title,
          message: outcome.message,
        });

        // The event list cached by the root store still holds the pre-run
        // assigned counts — it is fed by the same endpoints, not by this page.
        void this.store.refresh();
      });
  }

  /**
   * No `POST` backs this button yet — the panel is ahead of the backend on
   * purpose (cf. project convention). The toast must not claim otherwise: it
   * used to announce a success with no write behind it, right under a banner
   * saying the soirée's points are already consolidated. The button is also
   * disabled once the soirée is settled (template); this early return covers
   * the keyboard path the same way `confirmRunMatching` does.
   */
  protected validateAssignments(): void {
    if (this.isSettled()) {
      this.toast.show({
        type: 'info',
        title: 'Soirée déjà clôturée',
        message: 'Rien à valider : les affectations sont déjà consolidées.',
      });
      return;
    }
    this.toast.show({
      type: 'info',
      title: 'Validation indisponible',
      message: "Cette action n'est pas encore reliée au serveur.",
    });
  }

  protected printAssignments(): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;
    this.printService.download(
      `/events/${eventData.event.id}/assignments/pdf`,
      `affectation-${eventData.event.name}.pdf`,
    );
  }

  protected isFull(p: PosteView): boolean {
    return p.assigned.length >= p.need;
  }

  protected posteBgClass(c: string): string {
    return c === 'red'
      ? 'bg-red-soft text-red'
      : c === 'blue'
        ? 'bg-blue-soft text-blue'
        : c === 'green'
          ? 'bg-ok-soft text-ok'
          : 'bg-warn-soft text-warn';
  }

  protected toFill(p: PosteView): number {
    return Math.max(0, p.need - p.assigned.length);
  }

  protected vacantSlots(p: PosteView): number[] {
    return Array.from({ length: this.toFill(p) }, (_, index) => index);
  }

  /**
   * The soirée's point movement, sign included. `clampPoints` is gone (D6) and
   * a member served on their first choice legitimately loses credit, so a
   * negative value is normal information — never hidden, and formatted the
   * same way as mes présences and l'accueil.
   */
  protected formatPointsDelta(delta: number): string {
    return sharedFormatPointsDelta(delta);
  }

  protected pointsDeltaClass(delta: number): string {
    if (delta > 0) return 'text-ok';
    return delta < 0 ? 'text-warn' : 'text-muted';
  }

  protected scoreClassSmall(score: number): string {
    return this.getScoreClass(score);
  }

  protected scoreClass(score: number): string {
    return this.getScoreClass(score);
  }

  protected algoRunLabel(): string {
    const runAt = this.algoRunAt();
    if (!runAt) return '';
    const minutes = Math.floor((Date.now() - runAt.getTime()) / 60000);
    if (minutes <= 0) return "à l'instant";
    if (minutes === 1) return 'il y a 1 min';
    return `il y a ${minutes} min`;
  }

  protected outcomeBannerClass(tone: ToastType): string {
    switch (tone) {
      case 'success':
        return 'border-ok bg-ok-soft text-ok';
      case 'warning':
        return 'border-warn bg-warn-soft text-warn';
      case 'error':
        return 'border-danger bg-danger-soft text-danger';
      default:
        return 'border-blue bg-blue-soft text-blue';
    }
  }

  /**
   * The lock is a property of ONE `member_event_assigned_jobs` row, so the
   * label names the moment too: a member may hold up to three postes, and
   * "verrouiller l'affectation de X" alone would not say which one flips.
   */
  protected lockLabel(
    memberName: string,
    posteName: string,
    periodLabel: string,
    locked: boolean,
  ): string {
    const target = `l'affectation de ${memberName} au poste ${posteName} (${periodLabel})`;
    return locked
      ? `Déverrouiller ${target} : elle pourra être remplacée par l'affectation automatique`
      : `Verrouiller ${target} : elle sera conservée par l'affectation automatique`;
  }

  /**
   * Persist the lock flag of ONE assignment — the `(member, event, job)` row,
   * never "the member": somebody on both the installation and the service has
   * two independent locks. Optimistic: the row flips immediately and rolls back
   * if the write fails.
   */
  protected toggleLock(memberId: number, jobId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;

    const key = assignmentKey(eventId, jobId, memberId);
    if (this.lockPending().has(key)) return;

    const next = !this.isLocked(jobId, memberId);
    // Captured before the optimistic patch zeroes it out, so a failed write can
    // put the real credit back instead of leaving it at `0` until a full reload.
    const previousPointsDelta =
      this.selectedEventData()
        ?.roles.find((r) => r.id === jobId)
        ?.assigned.find((a) => a.memberId === memberId)?.pointsDelta ?? 0;
    this.setLockPending(key, true);
    // `setAssignmentLock` recreates the row, which resets `points_delta` to 0
    // server-side — mirror that instead of showing a value that no longer exists.
    this.patchRole(eventId, jobId, (assigned) =>
      assigned.map((a) => (a.memberId === memberId ? { ...a, locked: next, pointsDelta: 0 } : a)),
    );

    this.svc.setAssignmentLock(eventId, memberId, jobId, next).subscribe({
      next: () => this.setLockPending(key, false),
      error: () => {
        this.setLockPending(key, false);
        // The write never reached the server: the row's real credit is still
        // whatever it was before, not the `0` the optimistic patch guessed at.
        this.patchRole(eventId, jobId, (assigned) =>
          assigned.map((a) =>
            a.memberId === memberId ? { ...a, locked: !next, pointsDelta: previousPointsDelta } : a,
          ),
        );
        this.toast.show({
          type: 'error',
          title: 'Verrouillage impossible',
          message: "L'état de verrouillage n'a pas pu être enregistré.",
        });
      },
    });
  }

  private isLocked(jobId: number, memberId: number): boolean {
    const role = this.selectedEventData()?.roles.find((r) => r.id === jobId);
    return role?.assigned.some((a) => a.memberId === memberId && a.locked) ?? false;
  }

  private setLockPending(key: string, pending: boolean): void {
    const next = new Set(this.lockPending());
    if (pending) next.add(key);
    else next.delete(key);
    this.lockPending.set(next);
  }

  private patchRole(
    eventId: number,
    roleId: number,
    update: (assigned: AssignedMember[]) => AssignedMember[],
  ): void {
    this.eventsData.update((events) =>
      events.map((ed) => {
        if (ed.event.id !== eventId) return ed;
        return {
          ...ed,
          roles: ed.roles.map((role) =>
            role.id === roleId ? { ...role, assigned: update(role.assigned) } : role,
          ),
        };
      }),
    );
  }

  private updateHeader(eventData: EventData | null, presentCount: number): void {
    const subtitle = eventData
      ? `${eventData.event.name} · ${presentCount} membres présents`
      : 'Coordination';
    const breadcrumb = eventData
      ? ['Préparation', 'Coordination', eventData.event.name]
      : ['Préparation', 'Coordination'];

    this.pageHeader.set({
      title: 'Coordination',
      subtitle,
      breadcrumb,
      activeNavId: 'coord',
    });

    const tpl = this.actionsTpl();
    if (tpl) this.pageHeader.setActions(tpl);
  }

  private buildPreferences(member: Member, eventData: EventData): string[] {
    const jobs = this.jobsById();
    const eventJobIds = new Set(eventData.roles.map((role) => role.id));
    const prefMap = this.preferenceByMember().get(member.id);
    const preferred = prefMap
      ? Array.from(prefMap.entries())
          .filter(([jobId]) => eventJobIds.has(jobId))
          .sort((a, b) => a[1] - b[1])
          .map(([jobId]) => jobs.get(jobId)?.name ?? '—')
      : [];

    const uniquePreferred = preferred.filter((name, idx) => preferred.indexOf(name) === idx);
    const fallback = eventData.roles
      .map((role) => role.name)
      .filter((roleName) => !uniquePreferred.includes(roleName));

    const merged = [...uniquePreferred, ...fallback].slice(0, 3);
    while (merged.length < 3) merged.push('—');
    return merged;
  }

  private getScoreClass(score: number): string {
    if (score >= 80) return 'text-ok';
    if (score >= 60) return 'text-warn';
    return 'text-error';
  }

  private loadCoordinationData(): void {
    this.loading.set(true);
    this.loadError.set(null);
    forkJoin({
      raw: this.svc.loadAll(),
      // A failed eligibility fetch must not blank the whole page: the badge it
      // feeds is informational, the assignments are not.
      eligible: this.svc.getJobEligibleMembers().pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ raw, eligible }) => {
        this.restrictedJobIds.set(new Set(eligible.map((row) => row.jobId)));
        this.applyLoadedData(raw);
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les données de coordination.');
        this.loading.set(false);
      },
    });
  }

  private applyLoadedData(raw: CoordinationApiData): void {
    this.allMembers.set(
      raw.members.map((m) => ({
        id: m.id,
        name: teamMemberName(m),
        // `GET /members` returns the role as the related record, not a string.
        role: m.role?.name ?? '—',
        points: m.points,
      })),
    );
    this.jobsById.set(new Map(raw.jobs.map((job) => [job.id, job] as const)));
    this.preferences.set(raw.preferences);
    this.eventsData.set(buildEventsData(raw, this.restrictedJobIds()));
    const events = this.eventsData();

    const routeId = this.routeEventId();
    const routeExists = routeId !== null && events.some((ed) => ed.event.id === routeId);
    const currentSelected = this.selectedEventId();
    const currentExists =
      currentSelected !== null && events.some((ed) => ed.event.id === currentSelected);
    const nextId = routeExists
      ? routeId
      : currentExists
        ? currentSelected
        : findNextEventId(events);

    this.selectedEventId.set(nextId);

    if (nextId !== null && routeId !== nextId) {
      this.router.navigate(['../', nextId], { relativeTo: this.route });
    }
  }

  /**
   * Persist the staffing of ONE event.
   *
   * This screen only ever writes `event_jobs` — which existing jobs this soirée
   * needs, and how many people on each. It never creates, renames or deletes a
   * job: those are global objects shared by every event, owned by
   * administration. Removing a poste here detaches it from this soirée only.
   */
  private saveRoleEdits(eventId: number, roles: RoleModalRole[]): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;

    const currentRoles = eventData.roles;
    const currentById = new Map(currentRoles.map((role) => [role.id, role] as const));
    const incomingJobIds = new Set(roles.map((role) => role.jobId));
    const removedRoles = currentRoles.filter((role) => !incomingJobIds.has(role.id));

    const ops: Observable<unknown>[] = [];

    roles.forEach((role) => {
      if (role.requiredCount <= 0) return;

      const current = currentById.get(role.jobId);
      if (!current) {
        ops.push(this.svc.createEventJob(eventId, role.jobId, role.requiredCount));
        return;
      }
      if (role.requiredCount !== current.requiredCount) {
        ops.push(this.svc.updateEventJob(eventId, role.jobId, role.requiredCount));
      }
    });

    removedRoles.forEach((role) => {
      const unassignOps = role.assigned.map((a) => this.svc.unassign(eventId, a.memberId, role.id));
      const unassign$: Observable<unknown> = unassignOps.length ? forkJoin(unassignOps) : of(null);
      ops.push(unassign$.pipe(switchMap(() => this.svc.deleteEventJob(eventId, role.id))));
    });

    const save$ = ops.length ? forkJoin(ops) : of([]);
    this.loading.set(true);
    this.loadError.set(null);

    save$
      .pipe(
        switchMap(() => this.svc.loadAll()),
        catchError(() => {
          this.loadError.set('Erreur lors de la mise à jour des postes.');
          return of(null);
        }),
        finalize(() => this.loading.set(false)),
      )
      .subscribe((raw) => {
        if (!raw) return;
        this.applyLoadedData(raw);
      });
  }
}
