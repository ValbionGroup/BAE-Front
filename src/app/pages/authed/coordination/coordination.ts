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
import { Observable, catchError, finalize, forkJoin, of, switchMap } from 'rxjs';
import {
  LucideDynamicIcon,
  LucideIconInput,
  LucidePlus,
  LucideX,
  LucideCheck,
  LucideUsers,
  LucideAlertTriangle,
  LucideFlame,
  LucideWine,
  LucideCreditCard,
  LucideShield,
  LucideMusic,
  LucideSmile,
  LucideSettings,
  LucideZap,
  LucideLock,
  LucideEllipsisVertical,
} from '@lucide/angular';
import {
  CoordinationService,
  type ApiJob,
  type ApiPreference,
  type CoordinationApiData,
} from '#core/services/coordination/coordination-service';
import { DropdownService } from '#shared/components/dropdown/dropdown.service';
import type { DropdownItemAction } from '#shared/components/dropdown/dropdown.models';
import { ModalService } from '#shared/components/modal/modal.service';
import type { RoleModalRole } from '#shared/components/modal/modal.models';
import { Btn } from '#shared/components/ui/btn/btn';
import { Badge } from '#shared/components/ui/badge/badge';
import { Avatar } from '#shared/components/ui/avatar/avatar';
import { PageHeaderService } from '#core/services/page-header/page-header-service.js';

interface Member {
  id: number;
  firstName: string;
  lastName: string;
  role: string;
  points: number;
}

interface Role {
  id: number;
  name: string;
  icon: LucideIconInput;
  requiredCount: number;
  assignedMemberIds: number[];
}

interface SoireeEvent {
  id: number;
  name: string;
  date: Date;
}

interface EventData {
  event: SoireeEvent;
  presentMemberIds: number[];
  roles: Role[];
}

interface PosteView {
  id: number;
  label: string;
  color: string;
  icon: LucideIconInput;
  need: number;
  assignedMemberIds: number[];
}

interface MemberView {
  id: number;
  name: string;
  poste: string;
  roleId: number | null;
  lock: boolean;
  score: number;
  bonus: number;
  preferences: string[];
}

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500',
];

const POSTE_COLORS = [
  'blue',
  'emerald',
  'amber',
  'rose',
  'indigo',
  'teal',
];

const LOCK_STORAGE_KEY = 'coordination-assignment-locks';

const JOB_ICONS: Record<string, LucideIconInput> = {
  'Barman': LucideWine,
  'Caissier': LucideCreditCard,
  'Serveur': LucideSmile,
  'Sécurité': LucideShield,
  'Logistique': LucideFlame,
  'Sono': LucideMusic,
};

function buildEventsData(raw: CoordinationApiData): EventData[] {
  return raw.events.map(event => ({
    event: { id: event.id, name: event.name, date: new Date(event.date) },
    presentMemberIds: raw.responses
      .filter(r => r.eventId === event.id && r.isAvailable)
      .map(r => r.memberId),
    roles: raw.eventJobs
      .filter(ej => ej.eventId === event.id)
      .map(ej => {
        const job = raw.jobs.find(j => j.id === ej.jobId)!;
        return {
          id: ej.jobId,
          name: job.name,
          icon: JOB_ICONS[job.name] ?? LucideUsers,
          requiredCount: ej.count,
          assignedMemberIds: raw.assignments
            .filter(a => a.eventId === event.id && a.jobId === ej.jobId)
            .map(a => a.memberId),
        };
      }),
  }));
}

function findNextEventId(events: EventData[]): number | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = events.find(ed => ed.event.date >= today);
  return next?.event.id ?? events.at(-1)?.event.id ?? null;
}

@Component({
  selector: 'bfd-coordination',
  imports: [Btn, Badge, Avatar, LucideDynamicIcon],
  templateUrl: './coordination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Coordination implements OnInit {
  private readonly svc = inject(CoordinationService);
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
  protected readonly icPlus = LucidePlus;
  protected readonly icMore = LucideEllipsisVertical;

  protected readonly dropdown = inject(DropdownService);
  private readonly modal = inject(ModalService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly allMembers = signal<Member[]>([]);
  protected readonly eventsData = signal<EventData[]>([]);
  protected readonly selectedEventId = signal<number | null>(null);
  protected readonly algoRunning = signal(false);
  protected readonly algoRunAt = signal<Date | null>(null);

  private readonly routeEventId = signal<number | null>(null);
  private readonly jobsById = signal<Map<number, ApiJob>>(new Map());
  private readonly preferences = signal<ApiPreference[]>([]);
  private readonly lockedAssignments = signal<Set<string>>(this.readLocks());
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
    this.eventsData().find(ed => ed.event.id === this.selectedEventId())
  );

  protected readonly presentMembers = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    return this.allMembers().filter(m => eventData.presentMemberIds.includes(m.id));
  });

  protected readonly memberRoleMap = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return new Map<number, string>();
    const map = new Map<number, string>();
    for (const role of eventData.roles) {
      for (const memberId of role.assignedMemberIds) {
        map.set(memberId, role.name);
      }
    }
    return map;
  });

  protected readonly assignedMemberIds = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return new Set<number>();
    const ids = new Set<number>();
    for (const role of eventData.roles) {
      for (const id of role.assignedMemberIds) ids.add(id);
    }
    return ids;
  });

  protected readonly availableMembers = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    const assigned = this.assignedMemberIds();
    return this.allMembers().filter(m =>
      eventData.presentMemberIds.includes(m.id) && !assigned.has(m.id)
    );
  });

  private readonly memberById = computed(() =>
    new Map(this.allMembers().map(member => [member.id, member] as const)),
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

  protected readonly algoSummary = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return null;
    const assignedCount = eventData.roles.reduce(
      (sum, role) => sum + role.assignedMemberIds.length,
      0,
    );
    const lockedCount = this.countLockedAssignments(eventData);
    const avgScore = this.averageAssignedScore(eventData);
    return { assignedCount, lockedCount, avgScore };
  });

  protected readonly unfulfilledCount = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return 0;
    return eventData.roles.filter(r => r.assignedMemberIds.length < r.requiredCount).length;
  });

  protected isFulfilled(role: Role): boolean {
    return role.assignedMemberIds.length >= role.requiredCount;
  }

  protected isPast(date: Date): boolean {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  }

  protected getMember(id: number): Member | undefined {
    return this.allMembers().find(m => m.id === id);
  }

  protected getMemberInitials(member: Member): string {
    return member.firstName[0] + member.lastName[0];
  }

  protected getAvatarColor(memberId: number): string {
    return AVATAR_COLORS[memberId % AVATAR_COLORS.length];
  }

  protected formatDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  }

  protected formatEventDate(date: Date): string {
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  protected getEmptySlots(role: Role): number[] {
    const count = Math.max(0, role.requiredCount - role.assignedMemberIds.length);
    return Array.from({ length: count }, (_, i) => i);
  }

  protected getEventCardClass(ed: EventData): string {
    if (this.selectedEventId() === ed.event.id) {
      return 'border-violet-500 bg-violet-50 dark:bg-violet-950/30 text-violet-900 dark:text-violet-100 shadow-sm';
    }
    if (this.isPast(ed.event.date)) {
      return 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-600';
    }
    return 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm';
  }

  protected getRoleCardClass(role: Role): string {
    return this.isFulfilled(role)
      ? 'border-emerald-200 dark:border-emerald-800/60'
      : 'border-red-200 dark:border-red-800/60';
  }

  protected getRoleHeaderClass(role: Role): string {
    return this.isFulfilled(role)
      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-200'
      : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-200';
  }

  protected getRoleCountClass(role: Role): string {
    return this.isFulfilled(role)
      ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
      : 'bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300';
  }

  protected selectEvent(id: number): void {
    this.selectedEventId.set(id);
    this.router.navigate(['../', id], { relativeTo: this.route });
  }

  protected assignMember(memberId: number, roleId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;

    this.eventsData.update(events =>
      events.map(ed => {
        if (ed.event.id !== eventId) return ed;
        return {
          ...ed,
          roles: ed.roles.map(r => {
            if (r.id !== roleId || r.assignedMemberIds.includes(memberId)) return r;
            return { ...r, assignedMemberIds: [...r.assignedMemberIds, memberId] };
          }),
        };
      })
    );

    this.svc.assign(eventId, memberId, roleId).subscribe({
      error: () => this.loadError.set('Erreur lors de l\'affectation.'),
    });
  }

  protected removeAssignment(memberId: number, roleId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;
    if (this.isLocked(eventId, roleId, memberId)) return;

    this.eventsData.update(events =>
      events.map(ed => {
        if (ed.event.id !== eventId) return ed;
        return {
          ...ed,
          roles: ed.roles.map(r => {
            if (r.id !== roleId) return r;
            return { ...r, assignedMemberIds: r.assignedMemberIds.filter(id => id !== memberId) };
          }),
        };
      })
    );

    this.svc.unassign(eventId, memberId, roleId).subscribe({
      error: () => this.loadError.set('Erreur lors de la suppression.'),
    });

    this.clearLock(eventId, roleId, memberId);
  }

  protected openRolesModal(): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;

    this.modal.open({
      type: 'roles',
      title: 'Gérer les postes',
      message: 'Ajoutez, renommez ou ajustez le nombre de personnes par poste.',
      roles: eventData.roles.map(role => ({
        id: role.id,
        name: role.name,
        requiredCount: role.requiredCount,
      })),
      onSave: (roles: RoleModalRole[]) => this.saveRoleEdits(eventData.event.id, roles),
    });
  }

  protected openRoleDropdown(anchor: HTMLElement, roleId: number): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;

    const members = this.availableMembers();
    const items: DropdownItemAction[] = members.map(m => ({
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

  protected runAlgorithm(): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;

    const eventId = eventData.event.id;
    const preferenceMap = this.preferenceByMember();
    const memberMap = this.memberById();

    const lockedByRole = new Map<number, number[]>();
    const assignedMembers = new Set<number>();
    for (const role of eventData.roles) {
      const locked = role.assignedMemberIds.filter(memberId =>
        this.isLocked(eventId, role.id, memberId),
      );
      lockedByRole.set(role.id, locked);
      locked.forEach(memberId => assignedMembers.add(memberId));
    }

    const nextAssignments = new Map<number, number[]>();
    for (const role of eventData.roles) {
      nextAssignments.set(role.id, [...(lockedByRole.get(role.id) ?? [])]);
    }

    const available = new Set(
      eventData.presentMemberIds.filter(memberId => !assignedMembers.has(memberId)),
    );

    const sortedRoles = [...eventData.roles].sort((a, b) => {
      const needA = Math.max(0, a.requiredCount - (nextAssignments.get(a.id)?.length ?? 0));
      const needB = Math.max(0, b.requiredCount - (nextAssignments.get(b.id)?.length ?? 0));
      if (needA !== needB) return needB - needA;
      return a.id - b.id;
    });

    const sortCandidates = (roleId: number, candidates: number[]): number[] => {
      return candidates.sort((a, b) => {
        const prefA = preferenceMap.get(a)?.get(roleId) ?? Number.MAX_SAFE_INTEGER;
        const prefB = preferenceMap.get(b)?.get(roleId) ?? Number.MAX_SAFE_INTEGER;
        if (prefA !== prefB) return prefA - prefB;
        const pointsA = memberMap.get(a)?.points ?? 0;
        const pointsB = memberMap.get(b)?.points ?? 0;
        if (pointsA !== pointsB) return pointsB - pointsA;
        return a - b;
      });
    };

    for (const role of sortedRoles) {
      const assigned = nextAssignments.get(role.id) ?? [];
      const needed = role.requiredCount - assigned.length;
      if (needed <= 0) continue;

      const candidates = sortCandidates(role.id, Array.from(available));
      for (const memberId of candidates) {
        if (assigned.length >= role.requiredCount) break;
        assigned.push(memberId);
        available.delete(memberId);
      }

      nextAssignments.set(role.id, assigned);
    }

    const currentAssignments: Array<{ roleId: number; memberId: number }> = [];
    for (const role of eventData.roles) {
      for (const memberId of role.assignedMemberIds) {
        currentAssignments.push({ roleId: role.id, memberId });
      }
    }

    const currentKeys = new Set(currentAssignments.map(a => this.lockKey(eventId, a.roleId, a.memberId)));
    const nextKeys = new Set(
      Array.from(nextAssignments.entries()).flatMap(([roleId, memberIds]) =>
        memberIds.map(memberId => this.lockKey(eventId, roleId, memberId)),
      ),
    );

    const toUnassign = currentAssignments.filter(({ roleId, memberId }) =>
      !this.isLocked(eventId, roleId, memberId) && !nextKeys.has(this.lockKey(eventId, roleId, memberId)),
    );
    const toAssign: Array<{ roleId: number; memberId: number }> = [];
    for (const [roleId, memberIds] of nextAssignments.entries()) {
      for (const memberId of memberIds) {
        const key = this.lockKey(eventId, roleId, memberId);
        if (!currentKeys.has(key)) {
          toAssign.push({ roleId, memberId });
        }
      }
    }

    this.applyAssignments(eventId, nextAssignments);

    const ops = [
      ...toUnassign.map(a => this.svc.unassign(eventId, a.memberId, a.roleId)),
      ...toAssign.map(a => this.svc.assign(eventId, a.memberId, a.roleId)),
    ];

    this.algoRunning.set(true);
    this.loadError.set(null);
    let success = true;
    const save$: Observable<CoordinationApiData | null> = ops.length
      ? forkJoin(ops).pipe(switchMap(() => this.svc.loadAll()))
      : of(null);

    save$
      .pipe(
        catchError(() => {
          success = false;
          this.loadError.set('Erreur lors de l\'exécution de l\'algorithme.');
          return of(null);
        }),
        finalize(() => this.algoRunning.set(false)),
      )
      .subscribe((raw: CoordinationApiData | null) => {
        if (raw) this.applyLoadedData(raw);
        if (success) this.algoRunAt.set(new Date());
      });
  }

  protected validateAssignments(): void {
    this.modal.open({
      type: 'success',
      title: 'Affectations validées',
      message: 'Les affectations ont bien été enregistrées.',
    });
  }

  private applyAssignments(eventId: number, assignments: Map<number, number[]>): void {
    this.eventsData.update(events =>
      events.map(ed => {
        if (ed.event.id !== eventId) return ed;
        return {
          ...ed,
          roles: ed.roles.map(role => ({
            ...role,
            assignedMemberIds: assignments.get(role.id) ?? [],
          })),
        };
      }),
    );
  }

  protected get postes(): PosteView[] {
    const eventData = this.selectedEventData();
    if (!eventData) return [];

    return eventData.roles.map((role, index) => ({
      id: role.id,
      label: role.name,
      color: POSTE_COLORS[index % POSTE_COLORS.length],
      icon: role.icon,
      need: role.requiredCount,
      assignedMemberIds: role.assignedMemberIds,
    }));
  }

  protected get membres(): MemberView[] {
    const eventData = this.selectedEventData();
    if (!eventData) return [];

    return this.allMembers().map((member) => {
      const assignedRole = eventData.roles.find(role => role.assignedMemberIds.includes(member.id));
      const roleId = assignedRole?.id ?? null;
      const score = member.points;
      const bonus = assignedRole ? Math.max(0, assignedRole.requiredCount - assignedRole.assignedMemberIds.length) : 0;
      const lock = roleId !== null
        ? this.isLocked(eventData.event.id, roleId, member.id)
        : false;

      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        poste: assignedRole?.name ?? member.role,
        roleId,
        lock,
        score,
        bonus,
        preferences: this.buildPreferences(member, eventData),
      };
    });
  }

  protected assignedTo(label: string): Array<{ id: number; name: string; lock: boolean; score: number }> {
    const poste = this.postes.find(role => role.label === label);
    if (!poste) return [];
    const eventId = this.selectedEventId();

    return poste.assignedMemberIds
      .map(memberId => this.getMember(memberId))
      .filter((member): member is Member => member !== undefined)
      .map(member => ({
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        lock: eventId !== null
          ? this.isLocked(eventId, poste.id, member.id)
          : false,
        score: member.points,
      }));
  }

  protected isFull(p: PosteView): boolean {
    return p.assignedMemberIds.length >= p.need;
  }

  protected posteBgClass(color: string): string {
    const palette: Record<string, string> = {
      blue: 'bg-blue-500',
      emerald: 'bg-emerald-500',
      amber: 'bg-amber-500',
      rose: 'bg-rose-500',
      indigo: 'bg-indigo-500',
      teal: 'bg-teal-500',
    };
    return palette[color] ?? 'bg-blue-500';
  }

  protected toFill(p: PosteView): number {
    return Math.max(0, p.need - p.assignedMemberIds.length);
  }

  protected vacantSlots(p: PosteView): number[] {
    return Array.from({ length: this.toFill(p) }, (_, index) => index);
  }

  protected prefsFor(member: MemberView): string[] {
    return member.preferences;
  }

  protected scoreClassSmall(score: number): string {
    return this.getScoreClass(score);
  }

  protected scoreClass(score: number): string {
    return this.getScoreClass(score);
  }

  protected bonusClass(bonus: number): string {
    if (bonus > 0) return 'text-ok';
    if (bonus < 0) return 'text-error';
    return 'text-muted';
  }

  protected algoRunLabel(): string {
    const runAt = this.algoRunAt();
    if (!runAt) return '';
    const minutes = Math.floor((Date.now() - runAt.getTime()) / 60000);
    if (minutes <= 0) return "a l'instant";
    if (minutes === 1) return 'il y a 1 min';
    return `il y a ${minutes} min`;
  }

  protected toggleLock(memberId: number, roleId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;
    const key = this.lockKey(eventId, roleId, memberId);
    const next = new Set(this.lockedAssignments());
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    this.setLocks(next);
  }

  protected isLocked(eventId: number, roleId: number, memberId: number): boolean {
    return this.lockedAssignments().has(this.lockKey(eventId, roleId, memberId));
  }

  private lockKey(eventId: number, roleId: number, memberId: number): string {
    return `${eventId}:${roleId}:${memberId}`;
  }

  private readLocks(): Set<string> {
    try {
      const raw = localStorage.getItem(LOCK_STORAGE_KEY);
      if (!raw) return new Set();
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return new Set();
      return new Set(parsed.filter((value) => typeof value === 'string'));
    } catch {
      return new Set();
    }
  }

  private setLocks(locks: Set<string>): void {
    this.lockedAssignments.set(new Set(locks));
    this.persistLocks(locks);
  }

  private persistLocks(locks: Set<string>): void {
    try {
      localStorage.setItem(LOCK_STORAGE_KEY, JSON.stringify(Array.from(locks)));
    } catch {
      // Ignore persistence errors (e.g., private mode or quota limits).
    }
  }

  private clearLock(eventId: number, roleId: number, memberId: number): void {
    const key = this.lockKey(eventId, roleId, memberId);
    if (!this.lockedAssignments().has(key)) return;
    const next = new Set(this.lockedAssignments());
    next.delete(key);
    this.setLocks(next);
  }

  private pruneLocks(events: EventData[]): void {
    const validKeys = new Set<string>();
    for (const eventData of events) {
      for (const role of eventData.roles) {
        for (const memberId of role.assignedMemberIds) {
          validKeys.add(this.lockKey(eventData.event.id, role.id, memberId));
        }
      }
    }

    const current = this.lockedAssignments();
    const next = new Set(Array.from(current).filter((key) => validKeys.has(key)));
    if (next.size !== current.size) {
      this.setLocks(next);
    }
  }

  private countLockedAssignments(eventData: EventData): number {
    return eventData.roles.reduce((sum, role) => {
      const count = role.assignedMemberIds.filter((memberId) =>
        this.isLocked(eventData.event.id, role.id, memberId),
      ).length;
      return sum + count;
    }, 0);
  }

  private averageAssignedScore(eventData: EventData): number {
    const memberMap = this.memberById();
    const assignedIds = eventData.roles.flatMap(role => role.assignedMemberIds);
    if (!assignedIds.length) return 0;
    const total = assignedIds.reduce((sum, memberId) => {
      return sum + (memberMap.get(memberId)?.points ?? 0);
    }, 0);
    return Math.round(total / assignedIds.length);
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
    const eventJobIds = new Set(eventData.roles.map(role => role.id));
    const prefMap = this.preferenceByMember().get(member.id);
    const preferred = prefMap
      ? Array.from(prefMap.entries())
          .filter(([jobId]) => eventJobIds.has(jobId))
          .sort((a, b) => a[1] - b[1])
          .map(([jobId]) => jobs.get(jobId)?.name ?? '—')
      : [];

    const uniquePreferred = preferred.filter((name, idx) => preferred.indexOf(name) === idx);
    const fallback = eventData.roles
      .map(role => role.name)
      .filter(roleName => !uniquePreferred.includes(roleName));

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
    this.svc.loadAll().subscribe({
      next: (raw) => {
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
    this.allMembers.set(raw.members.map(m => ({
      id: m.id,
      firstName: m.firstName,
      lastName: m.lastName,
      role: m.role,
      points: m.points,
    })));
    this.jobsById.set(new Map(raw.jobs.map(job => [job.id, job] as const)));
    this.preferences.set(raw.preferences);
    const events = buildEventsData(raw);
    this.eventsData.set(events);
    this.pruneLocks(events);

    const routeId = this.routeEventId();
    const routeExists = routeId !== null && events.some(ed => ed.event.id === routeId);
    const currentSelected = this.selectedEventId();
    const currentExists = currentSelected !== null && events.some(ed => ed.event.id === currentSelected);
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

  private saveRoleEdits(eventId: number, roles: RoleModalRole[]): void {
    const eventData = this.selectedEventData();
    if (!eventData) return;

    const currentRoles = eventData.roles;
    const currentById = new Map(currentRoles.map(role => [role.id, role] as const));
    const incomingExistingIds = new Set(
      roles.filter(role => role.id !== null).map(role => role.id as number),
    );
    const removedRoles = currentRoles.filter(role => !incomingExistingIds.has(role.id));
    const usedInOtherEvents = new Set(
      this.eventsData()
        .filter(ed => ed.event.id !== eventId)
        .flatMap(ed => ed.roles.map(role => role.id)),
    );

    const ops: Observable<unknown>[] = [];

    roles.forEach(role => {
      const trimmedName = role.name.trim();
      if (!trimmedName) return;

      if (role.id === null) {
        ops.push(
          this.svc.createJob(trimmedName).pipe(
            switchMap(job => this.svc.createEventJob(eventId, job.id, role.requiredCount)),
          ),
        );
        return;
      }

      const current = currentById.get(role.id);
      if (!current) return;

      if (trimmedName !== current.name) {
        ops.push(this.svc.updateJob(role.id, trimmedName));
      }
      if (role.requiredCount !== current.requiredCount) {
        ops.push(this.svc.updateEventJob(eventId, role.id, role.requiredCount));
      }
    });

    removedRoles.forEach(role => {
      const unassignOps = role.assignedMemberIds.map(memberId =>
        this.svc.unassign(eventId, memberId, role.id),
      );
      const unassign$: Observable<unknown> = unassignOps.length ? forkJoin(unassignOps) : of(null);
      const deleteEventJob$ = unassign$.pipe(
        switchMap(() => this.svc.deleteEventJob(eventId, role.id)),
      );
      if (usedInOtherEvents.has(role.id)) {
        ops.push(deleteEventJob$);
      } else {
        ops.push(deleteEventJob$.pipe(switchMap(() => this.svc.deleteJob(role.id))));
      }
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
