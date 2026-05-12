import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import {
  LucideDynamicIcon,
  LucidePlus,
  LucideX,
  LucideCheck,
  LucideUsers,
  LucideAlertTriangle,
} from '@lucide/angular';
import { EventsService } from '#core/services/events/events-service';
import { Member, Role, EventData } from '#core/models/coordination.model';

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
  private readonly eventsService = inject(EventsService);

  protected readonly eventsData = this.eventsService.events;
  protected selectedEventId = signal<string>(findNextEventId(this.eventsData()));
  protected openPickerRoleId = signal<string | null>(null);

  protected selectedEventData = computed(() =>
    this.eventsData().find(ed => ed.event.id === this.selectedEventId())
  );

  protected presentMembers = computed(() => {
    const eventData = this.selectedEventData();
    if (!eventData) return [];
    const members = this.eventsService.members();
    return members.filter(m => eventData.presentMemberIds.includes(m.id));
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
    const members = this.eventsService.members();
    return members.filter(m =>
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
    return this.eventsService.members().find(m => m.id === id);
  }

  protected getMemberInitials(member: Member): string {
    return member.firstName[0] + member.lastName[0];
  }

  protected getAvatarColor(memberId: string): string {
    return this.eventsService.getAvatarColor(memberId);
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
    this.eventsService.assignMember(this.selectedEventId(), roleId, memberId);
    this.openPickerRoleId.set(null);
  }

  protected removeAssignment(memberId: string, roleId: string): void {
    this.eventsService.removeAssignment(this.selectedEventId(), roleId, memberId);
  }
}
