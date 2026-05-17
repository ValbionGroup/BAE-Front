import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

// All fields are camelCase: the apiResponseCaseInterceptor converts snake_case responses automatically.
export interface ApiEvent { id: number; name: string; date: string; }
export interface ApiMember { id: number; firstName: string; lastName: string; role: string; points: number; }
export interface ApiJob { id: number; name: string; }
export interface ApiEventJob { eventId: number; jobId: number; count: number; }
export interface ApiAssignment { memberId: number; eventId: number; jobId: number; }
export interface ApiAvailability { memberId: number; eventId: number; isAvailable: boolean; }

export interface CoordinationApiData {
  events: ApiEvent[];
  members: ApiMember[];
  jobs: ApiJob[];
  eventJobs: ApiEventJob[];
  assignments: ApiAssignment[];
  responses: ApiAvailability[];
}

@Injectable({ providedIn: 'root' })
export class CoordinationService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  loadAll(): Observable<CoordinationApiData> {
    return forkJoin({
      events: this.http.get<ApiEvent[]>(`${this.baseUrl}/events`),
      members: this.http.get<ApiMember[]>(`${this.baseUrl}/members`),
      jobs: this.http.get<ApiJob[]>(`${this.baseUrl}/jobs`),
      eventJobs: this.http.get<ApiEventJob[]>(`${this.baseUrl}/event_jobs`),
      assignments: this.http.get<ApiAssignment[]>(`${this.baseUrl}/assignments`),
      responses: this.http.get<ApiAvailability[]>(`${this.baseUrl}/responses`),
    });
  }

  // Body keys are camelCase: apiCaseRequestInterceptor converts them to snake_case before sending.
  assign(eventId: number, memberId: number, jobId: number): Observable<ApiAssignment> {
    return this.http.post<ApiAssignment>(`${this.baseUrl}/assignments`, { eventId, memberId, jobId });
  }

  // Params are NOT converted by the interceptor — use snake_case explicitly.
  unassign(eventId: number, memberId: number, jobId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/assignments`, {
      params: { member_id: memberId, event_id: eventId, job_id: jobId },
    });
  }
}
