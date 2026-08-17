import { Injectable, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import {
  EventApiDto,
  EventData,
  EventDetail,
  Presence,
  RosterRow,
  RosterRowApiDto,
} from '#core/models/event.model';
import { API_BASE_URL } from '@bae/ui';
import { ApiEndPointV1 } from '#core/models/endpoint.model';

@Injectable({ providedIn: 'root' })
export class EventsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  fetchAll(): Observable<EventDetail[]> {
    const url = this.buildUrl(ApiEndPointV1.EVENTS);
    return this.http
      .get<EventApiDto[]>(url)
      .pipe(map((dtos) => dtos.map((d) => this.toEventData(d))));
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

  updatePresenceForEvent(
    id: string,
    presence: Presence,
  ): Observable<EventDetail['memberPresence']> {
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
      status: dto.status,
      assigneeCount: dto.assigneeCount,
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
