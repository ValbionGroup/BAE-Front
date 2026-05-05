import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
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

interface Member {
  id: string;
  firstName: string;
  lastName: string;
}

interface Role {
  id: string;
  name: string;
  icon: LucideIconInput;
  requiredCount: number;
  assignedMemberIds: string[];
}

interface SoireeEvent {
  id: string;
  name: string;
  date: Date;
}

interface EventData {
  event: SoireeEvent;
  presentMemberIds: string[];
  roles: Role[];
}

const MEMBERS: Member[] = [
  { id: 'm1', firstName: 'Lucas', lastName: 'Espiet' },
  { id: 'm2', firstName: 'Marie', lastName: 'Dupont' },
  { id: 'm3', firstName: 'Thomas', lastName: 'Martin' },
  { id: 'm4', firstName: 'Chloé', lastName: 'Bernard' },
  { id: 'm5', firstName: 'Antoine', lastName: 'Petit' },
  { id: 'm6', firstName: 'Camille', lastName: 'Roux' },
  { id: 'm7', firstName: 'Paul', lastName: 'Moreau' },
  { id: 'm8', firstName: 'Julie', lastName: 'Simon' },
  { id: 'm9', firstName: 'Nicolas', lastName: 'Laurent' },
  { id: 'm10', firstName: 'Emma', lastName: 'Lefebvre' },
];

const AVATAR_COLORS = [
  'bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
  'bg-rose-500', 'bg-indigo-500', 'bg-teal-500', 'bg-orange-500',
  'bg-pink-500', 'bg-cyan-500',
];

function createInitialEventsData(): EventData[] {
  return [
    {
      event: { id: 'e1', name: 'Soirée Electro', date: new Date(2026, 2, 14) },
      presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8'],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 2, assignedMemberIds: ['m1', 'm2'] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 2, assignedMemberIds: ['m3', 'm4'] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 1, assignedMemberIds: ['m5'] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 1, assignedMemberIds: ['m6'] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: ['m7'] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 1, assignedMemberIds: ['m8'] },
      ],
    },
    {
      event: { id: 'e2', name: 'Soirée Hip-Hop', date: new Date(2026, 3, 11) },
      presentMemberIds: ['m1', 'm3', 'm5', 'm7', 'm9', 'm2', 'm4', 'm6'],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 2, assignedMemberIds: ['m9', 'm1'] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 2, assignedMemberIds: ['m3', 'm5'] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 1, assignedMemberIds: ['m7'] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 1, assignedMemberIds: ['m2'] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: ['m4'] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 1, assignedMemberIds: ['m6'] },
      ],
    },
    {
      event: { id: 'e3', name: 'Soirée Jungle', date: new Date(2026, 4, 16) },
      presentMemberIds: ['m1', 'm2', 'm3', 'm4', 'm5', 'm6', 'm7', 'm8', 'm9'],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 3, assignedMemberIds: ['m1'] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 3, assignedMemberIds: ['m3', 'm4'] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 2, assignedMemberIds: ['m5', 'm6'] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 2, assignedMemberIds: ['m7'] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: [] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 2, assignedMemberIds: ['m2'] },
      ],
    },
    {
      event: { id: 'e4', name: 'Soirée Techno', date: new Date(2026, 5, 13) },
      presentMemberIds: [],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 3, assignedMemberIds: [] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 3, assignedMemberIds: [] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 2, assignedMemberIds: [] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 2, assignedMemberIds: [] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: [] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 2, assignedMemberIds: [] },
      ],
    },
    {
      event: { id: 'e5', name: 'Soirée Latino', date: new Date(2026, 6, 4) },
      presentMemberIds: [],
      roles: [
        { id: 'barbecue', name: 'Barbecue', icon: LucideFlame, requiredCount: 3, assignedMemberIds: [] },
        { id: 'bar', name: 'Bar', icon: LucideWine, requiredCount: 3, assignedMemberIds: [] },
        { id: 'caisse', name: 'Caisse', icon: LucideCreditCard, requiredCount: 2, assignedMemberIds: [] },
        { id: 'securite', name: 'Sécurité', icon: LucideShield, requiredCount: 2, assignedMemberIds: [] },
        { id: 'sono', name: 'Sono', icon: LucideMusic, requiredCount: 1, assignedMemberIds: [] },
        { id: 'accueil', name: 'Accueil', icon: LucideSmile, requiredCount: 2, assignedMemberIds: [] },
      ],
    },
  ];
}

function findNextEventId(events: EventData[]): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const next = events.find(ed => ed.event.date >= today);
  return next?.event.id ?? events[events.length - 1].event.id;
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
export class Coordination {
  protected eventsData = signal<EventData[]>(createInitialEventsData());
  protected selectedEventId = signal<string>(findNextEventId(this.eventsData()));
  protected openPickerRoleId = signal<string | null>(null);

  protected selectedEventData = computed(() =>
    this.eventsData().find(ed => ed.event.id === this.selectedEventId())
  );

  protected presentMembers = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    return MEMBERS.filter(m => eventData.presentMemberIds.includes(m.id));
  });

  protected memberRoleMap = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return new Map<string, string>();
    const map = new Map<string, string>();
    for (const role of eventData.roles) {
      for (const memberId of role.assignedMemberIds) {
        map.set(memberId, role.name);
      }
    }
    return map;
  });

  protected assignedMemberIds = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return new Set<string>();
    const ids = new Set<string>();
    for (const role of eventData.roles) {
      for (const id of role.assignedMemberIds) ids.add(id);
    }
    return ids;
  });

  protected availableMembers = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    const assigned = this.assignedMemberIds();
    return MEMBERS.filter(m =>
      eventData.presentMemberIds.includes(m.id) && !assigned.has(m.id)
    );
  });

  protected unfulfilledCount = computed(() => {
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

  protected getMember(id: string): Member | undefined {
    return MEMBERS.find(m => m.id === id);
  }

  protected getMemberInitials(member: Member): string {
    return member.firstName[0] + member.lastName[0];
  }

  protected getAvatarColor(memberId: string): string {
    const idx = MEMBERS.findIndex(m => m.id === memberId);
    return AVATAR_COLORS[idx % AVATAR_COLORS.length];
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

  protected selectEvent(id: string): void {
    this.selectedEventId.set(id);
    this.openPickerRoleId.set(null);
  }

  protected togglePicker(roleId: string): void {
    this.openPickerRoleId.update(current => current === roleId ? null : roleId);
  }

  protected assignMember(memberId: string, roleId: string): void {
    this.eventsData.update(events =>
      events.map(ed => {
        if (ed.event.id !== this.selectedEventId()) return ed;
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
  }

  protected removeAssignment(memberId: string, roleId: string): void {
    this.eventsData.update(events =>
      events.map(ed => {
        if (ed.event.id !== this.selectedEventId()) return ed;
        return {
          ...ed,
          roles: ed.roles.map(r => {
            if (r.id !== roleId) return r;
            return { ...r, assignedMemberIds: r.assignedMemberIds.filter(id => id !== memberId) };
          }),
        };
      })
    );
  }
}
