import { ChangeDetectionStrategy, Component, computed, effect, inject, OnInit, signal, TemplateRef, viewChild } from '@angular/core';
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
  type CoordinationApiData,
} from '#core/services/coordination/coordination-service';
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
  private readonly actionsTpl = viewChild<TemplateRef<unknown>>('actions');

  protected readonly icSettings = LucideSettings;
  protected readonly icZap = LucideZap;
  protected readonly icCheck = LucideCheck;
  protected readonly icLock = LucideLock;
  protected readonly icPlus = LucidePlus;
  protected readonly icMore = LucideEllipsisVertical;

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly allMembers = signal<Member[]>([]);
  protected readonly eventsData = signal<EventData[]>([]);
  protected readonly selectedEventId = signal<number | null>(null);
  protected readonly openPickerRoleId = signal<number | null>(null);
  constructor() {
    this.pageHeader.set({
      title: 'Coordination',
      subtitle: 'Soirée Hivernale · 18 membres présents',
      breadcrumb: ['Préparation', 'Coordination', 'Soirée Hivernale'],
      activeNavId: 'coord',
    });
    effect(() => {
      const tpl = this.actionsTpl();
      if (tpl) this.pageHeader.setActions(tpl);
    });
  }

  ngOnInit(): void {
    this.svc.loadAll().subscribe({
      next: (raw) => {
        this.allMembers.set(raw.members.map(m => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
          role: m.role,
          points: m.points,
        })));
        const events = buildEventsData(raw);
        this.eventsData.set(events);
        this.selectedEventId.set(findNextEventId(events));
        this.loading.set(false);
      },
      error: () => {
        this.loadError.set('Impossible de charger les données de coordination.');
        this.loading.set(false);
      },
    });
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
    this.openPickerRoleId.set(null);
  }

  protected togglePicker(roleId: number): void {
    this.openPickerRoleId.update(current => current === roleId ? null : roleId);
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
    this.openPickerRoleId.set(null);

    this.svc.assign(eventId, memberId, roleId).subscribe({
      error: () => this.loadError.set('Erreur lors de l\'affectation.'),
    });
  }

  protected removeAssignment(memberId: number, roleId: number): void {
    const eventId = this.selectedEventId();
    if (eventId === null) return;

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
      const score = member.points;
      const bonus = assignedRole ? Math.max(0, assignedRole.requiredCount - assignedRole.assignedMemberIds.length) : 0;

      return {
        id: member.id,
        name: `${member.firstName} ${member.lastName}`,
        poste: assignedRole?.name ?? member.role,
        lock: score >= 90,
        score,
        bonus,
        preferences: this.buildPreferences(member, eventData),
      };
    });
  }

  protected assignedTo(label: string): Array<{ name: string; lock: boolean; score: number }> {
    const poste = this.postes.find(role => role.label === label);
    if (!poste) return [];

    return poste.assignedMemberIds
      .map(memberId => this.getMember(memberId))
      .filter((member): member is Member => member !== undefined)
      .map(member => ({
        name: `${member.firstName} ${member.lastName}`,
        lock: member.points >= 90,
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

  private buildPreferences(member: Member, eventData: EventData): string[] {
    const ordered = [
      member.role,
      ...eventData.roles.map(role => role.name).filter(roleName => roleName !== member.role),
    ];
    return ordered.slice(0, 3).concat(Array.from({ length: Math.max(0, 3 - ordered.length) }, () => '—')).slice(0, 3);
  }

  private getScoreClass(score: number): string {
    if (score >= 80) return 'text-ok';
    if (score >= 60) return 'text-warn';
    return 'text-error';
  }
}
