import { Injectable, Signal, computed, signal } from '@angular/core';
import { EventDetail, MenuItem } from '#core/models/event.model';
import { Member, Role, createInitialEventsData, MEMBERS, AVATAR_COLORS } from '#core/models/coordination.model';

function buildInitialEvents(): EventDetail[] {
  const base = createInitialEventsData();

  const menus: Record<string, MenuItem[]> = {
    e1: [
      { recipeId: 'r6', recipeName: 'Merguez frites', servings: 80, prepNotes: 'Grill dès 19h' },
      { recipeId: 'r1', recipeName: 'Mojito', servings: 120 },
      { recipeId: 'r2', recipeName: 'Panaché', servings: 60 },
      { recipeId: 'r4', recipeName: 'Plateau apéro', servings: 30, prepNotes: '4 personnes par plateau' },
    ],
    e2: [
      { recipeId: 'r6', recipeName: 'Merguez frites', servings: 70 },
      { recipeId: 'r3', recipeName: 'Sangria', servings: 50, prepNotes: 'Préparer la veille' },
      { recipeId: 'r5', recipeName: 'Vodka Orange', servings: 40 },
    ],
    e3: [
      { recipeId: 'r1', recipeName: 'Mojito', servings: 100 },
      { recipeId: 'r6', recipeName: 'Merguez frites', servings: 90 },
      { recipeId: 'r7', recipeName: 'Crêpe au sucre', servings: 50, prepNotes: 'Pâte faite sur place' },
      { recipeId: 'r8', recipeName: 'Bière pression', servings: 150 },
    ],
    e4: [
      { recipeId: 'r8', recipeName: 'Bière pression', servings: 200 },
      { recipeId: 'r5', recipeName: 'Vodka Orange', servings: 60 },
      { recipeId: 'r6', recipeName: 'Merguez frites', servings: 100 },
    ],
    e5: [
      { recipeId: 'r3', recipeName: 'Sangria', servings: 80, prepNotes: 'Thème latin — prévoir fruits frais' },
      { recipeId: 'r9', recipeName: 'Tapas variées', servings: 50 },
      { recipeId: 'r6', recipeName: 'Merguez frites', servings: 70 },
      { recipeId: 'r1', recipeName: 'Mojito', servings: 60 },
    ],
  };

  const locations: Record<string, string> = {
    e1: 'Foyer Centrale Lyon',
    e2: 'Salle des fêtes — Campus La Doua',
    e3: 'Foyer Centrale Lyon',
    e4: 'Entrepôt 42, Lyon 7e',
    e5: 'Foyer Centrale Lyon',
  };

  return base.map(ed => ({
    ...ed,
    location: locations[ed.event.id] ?? 'Foyer Centrale Lyon',
    menu: menus[ed.event.id] ?? [],
  }));
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly _events = signal<EventDetail[]>(buildInitialEvents());

  readonly events: Signal<EventDetail[]> = this._events.asReadonly();

  readonly members: Signal<Member[]> = computed(() => MEMBERS);

  readonly currentActiveEvent: Signal<EventDetail | null> = computed(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return (
      this._events().find(ed => {
        const d = ed.event.date;
        const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return dStr === todayStr;
      }) ?? null
    );
  });

  readonly upcomingEvents: Signal<EventDetail[]> = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return this._events()
      .filter(ed => ed.event.date > now)
      .sort((a, b) => a.event.date.getTime() - b.event.date.getTime());
  });

  readonly nextUpcomingEvent: Signal<EventDetail | null> = computed(
    () => this.upcomingEvents()[0] ?? null,
  );

  stationForMember(memberId: string, eventId: string): Role | null {
    const eventDetail = this._events().find(ed => ed.event.id === eventId);
    if (!eventDetail) return null;
    return (
      eventDetail.roles.find(r => r.assignedMemberIds.includes(memberId)) ?? null
    );
  }

  menuForEvent(eventId: string): MenuItem[] {
    return this._events().find(ed => ed.event.id === eventId)?.menu ?? [];
  }

  getAvatarColor(memberId: string): string {
    const idx = MEMBERS.findIndex(m => m.id === memberId);
    return AVATAR_COLORS[idx % AVATAR_COLORS.length];
  }

  /** Assign a member to a role within an event (used by Coordination). */
  assignMember(eventId: string, roleId: string, memberId: string): void {
    this._events.update(events =>
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
  }

  /** Remove a member from a role within an event (used by Coordination). */
  removeAssignment(eventId: string, roleId: string, memberId: string): void {
    this._events.update(events =>
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
  }
}
