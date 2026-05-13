import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
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
} from '@lucide/angular';
import {
  CoordinationService,
  type CoordinationApiData,
} from '#core/services/coordination/coordination-service';

interface Member {
  id: number;
  firstName: string;
  lastName: string;
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

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500',
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
  imports: [
    LucideDynamicIcon,
    LucideUsers,
    LucideAlertTriangle,
    LucideCheck,
    LucidePlus,
    LucideX,
  ],
  templateUrl: './coordination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Coordination implements OnInit {
  private readonly svc = inject(CoordinationService);

  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly allMembers = signal<Member[]>([]);
  protected readonly eventsData = signal<EventData[]>([]);
  protected readonly selectedEventId = signal<number | null>(null);
  protected readonly openPickerRoleId = signal<number | null>(null);

  ngOnInit(): void {
    this.svc.loadAll().subscribe({
      next: (raw) => {
        this.allMembers.set(raw.members.map(m => ({
          id: m.id,
          firstName: m.firstName,
          lastName: m.lastName,
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
}
