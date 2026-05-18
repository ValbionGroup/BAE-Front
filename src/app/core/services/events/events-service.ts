import { Injectable, Signal, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, tap } from 'rxjs';
import { EventApiDto, EventDetail, RosterRow, RosterRowApiDto } from '#core/models/event.model';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { ApiEndPointV1 } from '#core/models/endpoint.model';


@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _events = signal<EventDetail[]>([]);

  readonly events: Signal<EventDetail[]> = this._events.asReadonly();

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
      map((dtos) => dtos.map((d) => this.toEventDetail(d))),
      tap((events) => this._events.set(events)),
    );
  }

  fetchRosterForEvent(id: string): Observable<RosterRow[]> {
    const url = this.buildUrl(ApiEndPointV1.EVENT_ROSTER).replace(':id', id);
    return this.http
      .get<RosterRowApiDto[]>(url)
      .pipe(map((dtos) => dtos.map((d) => this.toRosterRow(d))));
  }

  private toEventDetail(dto: EventApiDto): EventDetail {
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
