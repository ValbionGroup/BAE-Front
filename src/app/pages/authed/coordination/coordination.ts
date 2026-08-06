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
} from '@lucide/angular';
import {
  CoordinationService,
  type ApiJob,
  type ApiMatchingSummary,
  type ApiPreference,
  type CoordinationApiData,
} from '#core/services/coordination/coordination-service';
import { CoordinationStore } from '#core/store/coordination.store';
import { DropdownService } from '#shared/components/dropdown/dropdown.service';
import type { DropdownItemAction } from '#shared/components/dropdown/dropdown.models';
import { ModalService } from '#shared/components/modal/modal.service';
import type { RoleModalRole } from '#shared/components/modal/modal.models';
import type { ToastType } from '#shared/components/toast/toast.models';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { PageHeaderService } from '#core/services/page-header/page-header-service.js';
import { ToastService } from '#shared/components/toast/toast.service';

interface Member {
  id: number;
  firstName: string;
  lastName: string;
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
}

export interface Role {
  id: number;
  name: string;
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
  color: string;
  icon: LucideIconInput;
  need: number;
  restricted: boolean;
  assigned: AssignedMemberView[];
}

interface MemberView {
  id: number;
  name: string;
  /** Job held on the selected soirée, or `null` when the member is unassigned. */
  poste: string | null;
  roleId: number | null;
  lock: boolean;
  lockPending: boolean;
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
    roles: raw.eventJobs
      .filter((ej) => ej.eventId === event.id)
      .map((ej) => {
        const job = raw.jobs.find((j) => j.id === ej.jobId)!;
        return {
          id: ej.jobId,
          name: job.name,
          icon: JOB_ICONS[job.name] ?? LucideUsers,
          requiredCount: ej.count,
          restricted: restrictedJobIds.has(ej.jobId),
          assigned: raw.assignments
            .filter((a) => a.eventId === event.id && a.jobId === ej.jobId)
            .map((a) => ({
              memberId: a.memberId,
              locked: a.locked,
              pointsDelta: a.pointsDelta,
            })),
        };
      }),
  }));
}

/**
 * Turn a matching summary into something the user can act on.
 *
 * The engine happily returns an empty `matched` when the event has no job,
 * nobody answered available, or every seat is already held by a locked row —
 * those must NOT read as a success, so the tone degrades to `info`/`warning`
 * and the message names the reason instead of claiming work happened.
 */
export function describeMatching(summary: ApiMatchingSummary): MatchingOutcome {
  const matched = summary.matched.length;
  const unmatched = summary.unmatchedMemberIds.length;
  const locked = summary.locked.length;

  const matchedPart = plural(matched, 'affectation générée', 'affectations générées');
  const unmatchedPart = plural(unmatched, 'membre non affecté', 'membres non affectés');
  const lockedPart = plural(
    locked,
    'affectation verrouillée conservée',
    'affectations verrouillées conservées',
  );

  if (matched === 0) {
    if (unmatched > 0) {
      const reason =
        locked > 0
          ? `toutes les places restantes sont verrouillées (${lockedPart}), ou aucun poste ne correspond à leurs préférences`
          : 'plus aucune place libre, ou aucun poste ne correspond à leurs préférences';
      return {
        tone: 'warning',
        title: 'Aucune affectation générée',
        message: `${plural(unmatched, 'membre disponible n’a pu être placé', 'membres disponibles n’ont pu être placés')} : ${reason}.`,
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
      message:
        'Aucun membre disponible à placer sur cette soirée. Vérifiez les réponses de disponibilité et les préférences avant de relancer.',
    };
  }

  const lockedSuffix = locked > 0 ? ` · ${lockedPart}` : '';

  if (unmatched > 0) {
    return {
      tone: 'warning',
      title: 'Affectation partielle',
      message: `${matchedPart} · ${unmatchedPart}${lockedSuffix}.`,
    };
  }

  return {
    tone: 'success',
    title: 'Affectation automatique terminée',
    message: `${matchedPart} · tous les membres disponibles ont été placés${lockedSuffix}.`,
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

  protected readonly dropdown = inject(DropdownService);
  private readonly modal = inject(ModalService);
  private readonly toast = inject(ToastService);

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

  protected readonly assignedMemberIds = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return new Set<number>();
    const ids = new Set<number>();
    for (const role of eventData.roles) {
      for (const a of role.assigned) ids.add(a.memberId);
    }
    return ids;
  });

  protected readonly availableMembers = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    const assigned = this.assignedMemberIds();
    return this.allMembers().filter(
      (m) => eventData.presentMemberIds.includes(m.id) && !assigned.has(m.id),
    );
  });

  /** Rows the next matching run would preserve. */
  protected readonly lockedCount = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return 0;
    return eventData.roles.reduce(
      (sum, role) => sum + role.assigned.filter((a) => a.locked).length,
      0,
    );
  });

  /** Rows the next matching run would delete and regenerate. */
  protected readonly replaceableCount = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return 0;
    return eventData.roles.reduce(
      (sum, role) => sum + role.assigned.filter((a) => !a.locked).length,
      0,
    );
  });

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
      color: POSTE_COLORS[index % POSTE_COLORS.length],
      icon: role.icon,
      need: role.requiredCount,
      restricted: role.restricted,
      assigned: role.assigned.map((a) => {
        const member = members.get(a.memberId);
        return {
          id: a.memberId,
          name: member ? `${member.firstName} ${member.lastName}` : `#${a.memberId}`,
          lock: a.locked,
          lockPending: pending.has(assignmentKey(eventData.event.id, role.id, a.memberId)),
          score: member?.points ?? 0,
          pointsDelta: a.pointsDelta,
        };
      }),
    }));
  });

  protected readonly membres = computed<MemberView[]>(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    const pending = this.lockPending();

    const views = this.allMembers().map((member) => {
      const assignedRole = eventData.roles.find((role) =>
        role.assigned.some((a) => a.memberId === member.id),
      );
      const assignment = assignedRole?.assigned.find((a) => a.memberId === member.id) ?? null;
      const roleId = assignedRole?.id ?? null;

      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        // The job this member holds on THIS soirée — `null` when unassigned.
        // Never their BAE function: a member's role (Trésorerie, Logistique…)
        // says what they are in the association, not what they are doing
        // tonight, and falling back to it made unassigned members look staffed.
        poste: assignedRole?.name ?? null,
        roleId,
        lock: assignment?.locked ?? false,
        lockPending:
          roleId !== null && pending.has(assignmentKey(eventData.event.id, roleId, member.id)),
        score: member.points,
        pointsDelta: assignment?.pointsDelta ?? 0,
        preferences: this.buildPreferences(member, eventData),
        isPresent: eventData.presentMemberIds.includes(member.id),
      };
    });

    return views.sort((a, b) => Number(b.isPresent) - Number(a.isPresent));
  });

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
        : [...assigned, { memberId, locked: false, pointsDelta: 0 }],
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
      title: 'Gérer les postes',
      message:
        'Choisissez les postes à armer sur cette soirée et le nombre de personnes par poste. ' +
        "Les postes eux-mêmes se créent et se renomment depuis l'administration.",
      roles: eventData.roles.map((role) => ({
        jobId: role.id,
        requiredCount: role.requiredCount,
      })),
      availableJobs: [...this.jobsById().values()]
        .map((job) => ({ id: job.id, name: job.name }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      onSave: (roles: RoleModalRole[]) => this.saveRoleEdits(eventData.event.id, roles),
    });
  }

  protected openRoleDropdown(anchor: HTMLElement, roleId: number): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;

    const members = this.availableMembers();
    const items: DropdownItemAction[] = members.map((m) => ({
      type: 'action',
      label: `${m.firstName} ${m.lastName}`,
      description: m.role,
      onClick: () => this.assignMember(m.id, roleId),
    }));

    this.dropdown.toggle({
      anchor,
      items,
      header: 'Affecter un membre',
      emptyLabel: 'Aucun membre disponible',
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
        catchError(() => {
          this.loadError.set("Erreur lors de l'exécution de l'algorithme.");
          this.toast.show({
            type: 'error',
            title: "Échec de l'affectation automatique",
            message: "L'algorithme n'a pas pu être exécuté. Les affectations sont inchangées.",
          });
          return of(null);
        }),
        finalize(() => this.algoRunning.set(false)),
      )
      .subscribe((result) => {
        if (!result) return;
        this.applyLoadedData(result.raw);
        this.algoRunAt.set(new Date());

        const outcome = describeMatching(result.summary);
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

  protected validateAssignments(): void {
    this.toast.show({
      type: 'success',
      title: 'Affectations validées',
      message: 'Les affectations ont bien été enregistrées.',
    });
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

  protected lockLabel(memberName: string, posteName: string, locked: boolean): string {
    return locked
      ? `Déverrouiller l'affectation de ${memberName} au poste ${posteName} : elle pourra être remplacée par l'affectation automatique`
      : `Verrouiller l'affectation de ${memberName} au poste ${posteName} : elle sera conservée par l'affectation automatique`;
  }

  /**
   * Persist the lock flag of one assignment. Optimistic: the row flips
   * immediately and rolls back if the write fails.
   */
  protected toggleLock(memberId: number, roleId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;

    const key = assignmentKey(eventId, roleId, memberId);
    if (this.lockPending().has(key)) return;

    const next = !this.isLocked(roleId, memberId);
    this.setLockPending(key, true);
    // `setAssignmentLock` recreates the row, which resets `points_delta` to 0
    // server-side — mirror that instead of showing a value that no longer exists.
    this.patchRole(eventId, roleId, (assigned) =>
      assigned.map((a) => (a.memberId === memberId ? { ...a, locked: next, pointsDelta: 0 } : a)),
    );

    this.svc.setAssignmentLock(eventId, memberId, roleId, next).subscribe({
      next: () => this.setLockPending(key, false),
      error: () => {
        this.setLockPending(key, false);
        this.patchRole(eventId, roleId, (assigned) =>
          assigned.map((a) => (a.memberId === memberId ? { ...a, locked: !next } : a)),
        );
        this.toast.show({
          type: 'error',
          title: 'Verrouillage impossible',
          message: "L'état de verrouillage n'a pas pu être enregistré.",
        });
      },
    });
  }

  private isLocked(roleId: number, memberId: number): boolean {
    const role = this.selectedEventData()?.roles.find((r) => r.id === roleId);
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
        firstName: m.firstName,
        lastName: m.lastName,
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
