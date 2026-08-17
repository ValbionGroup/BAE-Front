import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import type { JobPeriod } from '#core/models/job-period.model';

export interface ApiEvent {
  id: number;
  name: string;
  date: string;
  duration: number | null;
}
export interface ApiRole {
  id: number;
  name: string;
}
export interface ApiMember {
  id: number;
  firstName: string;
  lastName: string;
  roleId: number | null;
  role: ApiRole | null;
  points: number;
}
export interface ApiJob {
  id: number;
  name: string;
  type: JobPeriod;
}
export interface ApiEventJob {
  eventId: number;
  jobId: number;
  count: number;
}
export interface ApiAssignment {
  memberId: number;
  eventId: number;
  jobId: number;
  locked: boolean;
  pointsDelta: number;
  settledAt: string | null;
}

export interface ApiTeammate {
  id: number;
  firstName: string;
  lastName: string;
}

export interface ApiMyAssignment {
  eventId: number;
  jobId: number;
  jobName: string;
  jobType: JobPeriod;
  pointsDelta: number;
  needed: number | null;
  teammates: readonly ApiTeammate[];
}

export interface ApiJobEligibleMember {
  jobId: number;
  memberId: number;
}
export interface ApiAvailability {
  memberId: number;
  eventId: number;
  isAvailable: boolean;
}
export interface ApiPreference {
  memberId: number;
  jobId: number;
  preferenceRank: number;
}

export interface CoordinationApiData {
  events: ApiEvent[];
  members: ApiMember[];
  jobs: ApiJob[];
  eventJobs: ApiEventJob[];
  assignments: ApiAssignment[];
  responses: ApiAvailability[];
  preferences: ApiPreference[];
}

export interface ApiMatchedAssignment {
  memberId: number;
  jobId: number;
  period: JobPeriod;
  rankAchieved: number | null;
  pointsDelta: number;
}

export interface ApiMatchingSummary {
  matched: ApiMatchedAssignment[];
  unmatchedMemberIds: number[];
  locked: { memberId: number; jobId: number; period: JobPeriod | null }[];
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
      eventJobs: this.http.get<ApiEventJob[]>(`${this.baseUrl}/event-jobs`),
      assignments: this.http.get<ApiAssignment[]>(`${this.baseUrl}/assignments`),
      responses: this.http.get<ApiAvailability[]>(`${this.baseUrl}/responses`),
      preferences: this.http.get<ApiPreference[]>(`${this.baseUrl}/preferences`),
    });
  }

  loadMyAssignments(): Observable<ApiMyAssignment[]> {
    return this.http.get<ApiMyAssignment[]>(`${this.baseUrl}/account/assignments`);
  }

  getJobEligibleMembers(): Observable<ApiJobEligibleMember[]> {
    return this.http.get<ApiJobEligibleMember[]>(`${this.baseUrl}/job-eligible-members`);
  }

  assign(
    eventId: number,
    memberId: number,
    jobId: number,
    locked = false,
  ): Observable<ApiAssignment> {
    return this.http.post<ApiAssignment>(`${this.baseUrl}/assignments`, {
      eventId,
      memberId,
      jobId,
      locked,
    });
  }

  setAssignmentLock(
    eventId: number,
    memberId: number,
    jobId: number,
    locked: boolean,
  ): Observable<ApiAssignment> {
    return this.http.put<ApiAssignment>(
      `${this.baseUrl}/assignments`,
      { locked },
      { params: { member_id: memberId, event_id: eventId, job_id: jobId } },
    );
  }

  runMatching(eventId: number): Observable<ApiMatchingSummary> {
    return this.http.post<ApiMatchingSummary>(`${this.baseUrl}/events/${eventId}/matching`, {});
  }

  unassign(eventId: number, memberId: number, jobId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/assignments`, {
      params: { member_id: memberId, event_id: eventId, job_id: jobId },
    });
  }

  createJob(name: string, type: JobPeriod): Observable<ApiJob> {
    return this.http.post<ApiJob>(`${this.baseUrl}/jobs`, { name, type });
  }

  createEvent(name: string, date: string, duration: number | null): Observable<ApiEvent> {
    return this.http.post<ApiEvent>(`${this.baseUrl}/events`, { name, date, duration });
  }

  updateEvent(
    id: number,
    name: string,
    date: string,
    duration: number | null,
  ): Observable<ApiEvent> {
    return this.http.put<ApiEvent>(`${this.baseUrl}/events/${id}`, { name, date, duration });
  }

  updateJob(id: number, name: string, type: JobPeriod): Observable<ApiJob> {
    return this.http.put<ApiJob>(`${this.baseUrl}/jobs/${id}`, { name, type });
  }

  deleteEvent(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/events/${id}`);
  }

  deleteJob(id: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/jobs/${id}`);
  }

  createEventJob(eventId: number, jobId: number, count: number): Observable<ApiEventJob> {
    return this.http.post<ApiEventJob>(`${this.baseUrl}/event-jobs`, { eventId, jobId, count });
  }

  updateEventJob(eventId: number, jobId: number, count: number): Observable<ApiEventJob> {
    return this.http.put<ApiEventJob>(
      `${this.baseUrl}/event-jobs`,
      { count },
      { params: { event_id: eventId, job_id: jobId } },
    );
  }

  deleteEventJob(eventId: number, jobId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/event-jobs`, {
      params: { event_id: eventId, job_id: jobId },
    });
  }
}
