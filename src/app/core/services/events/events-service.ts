import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import {
  EventApiDto,
  EventData,
  EventDetail,
  MenuItem,
  RosterRow,
  RosterRowApiDto,
} from '#core/models/event.model';
import {
  Member,
  Role,
  createInitialEventsData,
  MEMBERS,
  AVATAR_COLORS,
} from '#core/models/coordination.model';
import { isNil } from '#shared/utils/base-function';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { ApiEndPointV1 } from '#core/models/endpoint.model';

interface LocalEventSeed {
  roles?: Role[];
  menu?: MenuItem[];
  memberPresence?: EventDetail['memberPresence'];
}

function buildLocalSeedById(): Map<string, LocalEventSeed> {
  const base = createInitialEventsData();

  const menus: Record<string, MenuItem[]> = {
    e1: [
      {
        recipeId: 'r6',
        recipeName: 'Merguez frites',
        servings: 80,
        price: 4.5,
        category: 'Plats',
        prepNotes: 'Grill dès 19h',
      },
      { recipeId: 'r1', recipeName: 'Mojito', servings: 120, price: 5, category: 'Boissons' },
      { recipeId: 'r2', recipeName: 'Panaché', servings: 60, price: 2.5, category: 'Boissons' },
      {
        recipeId: 'r4',
        recipeName: 'Plateau apéro',
        servings: 30,
        price: 6,
        category: 'Snacks',
        prepNotes: '4 personnes par plateau',
      },
    ],
    e2: [
      { recipeId: 'r6', recipeName: 'Merguez frites', servings: 70, price: 4.5, category: 'Plats' },
      {
        recipeId: 'r3',
        recipeName: 'Sangria',
        servings: 50,
        price: 3,
        category: 'Boissons',
        prepNotes: 'Préparer la veille',
      },
      {
        recipeId: 'r5',
        recipeName: 'Vodka Orange',
        servings: 40,
        price: 4,
        category: 'Boissons',
      },
    ],
    e3: [
      { recipeId: 'r1', recipeName: 'Mojito', servings: 100, price: 5, category: 'Boissons' },
      { recipeId: 'r6', recipeName: 'Merguez frites', servings: 90, price: 4.5, category: 'Plats' },
      {
        recipeId: 'r7',
        recipeName: 'Crêpe au sucre',
        servings: 50,
        price: 1.5,
        category: 'Desserts',
        prepNotes: 'Pâte faite sur place',
      },
      {
        recipeId: 'r8',
        recipeName: 'Bière pression',
        servings: 150,
        price: 3,
        category: 'Boissons',
      },
    ],
    e4: [
      {
        recipeId: 'r8',
        recipeName: 'Bière pression',
        servings: 200,
        price: 3,
        category: 'Boissons',
      },
      {
        recipeId: 'r5',
        recipeName: 'Vodka Orange',
        servings: 60,
        price: 4,
        category: 'Boissons',
      },
      {
        recipeId: 'r6',
        recipeName: 'Merguez frites',
        servings: 100,
        price: 4.5,
        category: 'Plats',
      },
    ],
    e5: [
      {
        recipeId: 'r3',
        recipeName: 'Sangria',
        servings: 80,
        price: 3,
        category: 'Boissons',
        prepNotes: 'Thème latin — prévoir fruits frais',
      },
      { recipeId: 'r9', recipeName: 'Tapas variées', servings: 50, price: 5.5, category: 'Snacks' },
      { recipeId: 'r6', recipeName: 'Merguez frites', servings: 70, price: 4.5, category: 'Plats' },
      { recipeId: 'r1', recipeName: 'Mojito', servings: 60, price: 5, category: 'Boissons' },
    ],
  };

  return new Map(
    base.map((ed) => [
      ed.id,
      {
        roles: ed.roles,
        memberPresence: ed.memberPresence,
        menu: menus[ed.id] ?? [],
      },
    ]),
  );
}

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly localSeedById = buildLocalSeedById();
  private readonly _events = signal<EventDetail[]>([]);

  readonly events: Signal<EventDetail[]> = this._events.asReadonly();

  readonly members: Signal<Member[]> = computed(() => MEMBERS);

  readonly currentActiveEvent: Signal<EventDetail | null> = computed(() => {
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}`;
    return (
      this._events().find((ed) => {
        const d = ed.date;
        const dStr = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
        return dStr === todayStr;
      }) ?? null
    );
  });

  readonly upcomingEvents: Signal<EventDetail[]> = computed(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return this._events()
      .filter((ed) => ed.date > now)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  });

  readonly nextUpcomingEvent: Signal<EventDetail | null> = computed(
    () => this.upcomingEvents()[0] ?? null,
  );

  fetchAll(): Observable<EventDetail[]> {
    const url = this.buildUrl(ApiEndPointV1.EVENTS);
    return this.http.get<EventApiDto[]>(url).pipe(
      map((dtos) => dtos.map((d) => this.mergeWithLocalSeed(this.toEventData(d)))),
      tap((events) => this._events.set(events)),
    );
  }

  fetchRosterForEvent(id: string): Observable<RosterRow[]> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_ROSTER).replace(':id', id);
    return this.http
      .get<RosterRowApiDto[]>(url)
      .pipe(map((dtos) => dtos.map((d) => this.toRosterRow(d))));
  }

  stationForMember(memberId: string, eventId: string): Role | null {
    const eventDetail = this._events().find((ed) => ed.id === eventId);
    if (!eventDetail || isNil(eventDetail.roles)) return null;
    return eventDetail.roles!.find((r) => r.assignedMemberIds.includes(memberId)) ?? null;
  }

  menuForEvent(eventId: string): MenuItem[] {
    return this._events().find((ed) => ed.id === eventId)?.menu ?? [];
  }

  getAvatarColor(memberId: string): string {
    const idx = MEMBERS.findIndex((m) => m.id === memberId);
    return AVATAR_COLORS[idx % AVATAR_COLORS.length];
  }

  /** Assign a member to a role within an event (used by Coordination). */
  assignMember(eventId: string, roleId: string, memberId: string): void {
    this._events.update((events) =>
      events.map((ed) => {
        if (ed.id !== eventId) return ed;
        if (isNil(ed.roles)) return ed;
        return {
          ...ed,
          roles: ed.roles?.map((r) => {
            if (r.id !== roleId || r.assignedMemberIds.includes(memberId)) return r;
            return { ...r, assignedMemberIds: [...r.assignedMemberIds, memberId] };
          }),
        };
      }),
    );
  }

  /** Remove a member from a role within an event (used by Coordination). */
  removeAssignment(eventId: string, roleId: string, memberId: string): void {
    this._events.update((events) =>
      events.map((ed) => {
        if (ed.id !== eventId) return ed;
        if (isNil(ed.roles)) return ed;
        return {
          ...ed,
          roles: ed.roles?.map((r) => {
            if (r.id !== roleId) return r;
            return { ...r, assignedMemberIds: r.assignedMemberIds.filter((id) => id !== memberId) };
          }),
        };
      }),
    );
  }

  private toEventData(dto: EventApiDto): EventData {
    return {
      id: dto.id,
      name: dto.name,
      location: dto.location,
      date: new Date(dto.date),
      description: dto.description,
      duration: dto.duration,
    };
  }

  private toRosterRow(dto: RosterRowApiDto): RosterRow {
    return {
      id: dto.id,
      name: dto.name,
      role: dto.role,
      status: dto.status,
      when: new Date(dto.when),
      late: dto.late,
    };
  }

  private mergeWithLocalSeed(event: EventData): EventDetail {
    const seed = this.localSeedById.get(event.id);
    return {
      ...event,
      roles: seed?.roles,
      menu: seed?.menu,
      memberPresence: seed?.memberPresence,
    };
  }

  private buildUrl(endpoint: ApiEndPointV1): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
