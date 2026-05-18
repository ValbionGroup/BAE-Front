import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {map, Observable} from 'rxjs';
import {
  EventApiDto,
  EventData,
  EventDetail,
  Presence,
  RosterRow,
  RosterRowApiDto,
} from '#core/models/event.model';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { ApiEndPointV1 } from '#core/models/endpoint.model';

<<<<<<<<< Temporary merge branch 1
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

=========
>>>>>>>>> Temporary merge branch 2
@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  readonly currentActiveEvent = computed<EventDetail | null>(() => {
    return null;
  });

  fetchAll(): Observable<EventDetail[]> {
    const url = this.buildUrl(ApiEndPointV1.EVENTS);
    return this.http.get<EventApiDto[]>(url).pipe(map((dtos) => dtos.map((d) => this.toEventData(d))));
  }

  fetchRosterForEvent(id: string): Observable<RosterRow[]> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_ROSTER).replace(':id', id);
    return this.http
      .get<RosterRowApiDto[]>(url)
      .pipe(map((dtos) => dtos.map((d) => this.toRosterRow(d))));
  }

  fetchPresenceForEvent(id: string): Observable<EventDetail['memberPresence']> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_MEMBER_RESPONSE).replace(':id', id);
    return this.http.get<EventDetail['memberPresence']>(url);
  }

  updatePresenceForEvent(id: string, presence: Presence): Observable<EventDetail['memberPresence']> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_MEMBER_RESPONSE).replace(':id', id);
    return this.http.post<EventDetail['memberPresence']>(url, { isAvailable: presence });
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

  private buildUrl(endpoint: ApiEndPointV1): string {
    return `${this.baseUrl}${endpoint}`;
  }
}
