import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

// All fields are camelCase: the apiResponseCaseInterceptor converts snake_case responses automatically.
export interface ApiEvent {
  id: number;
  name: string;
  date: string;
  duration: number | null;
}
/**
 * `GET /members` returns the member's role as the full related record, not a
 * plain string. Reading `member.role` directly renders `[object Object]` —
 * always go through `role.name` for a display string.
 */
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
  /** A locked row is preserved verbatim by `POST /events/:id/matching`: the
   *  algorithm neither deletes it nor puts its member back in the pool. */
  locked: boolean;
  /** Points actually credited to the member when the matching engine created
   *  this row (0 for rows created by hand). */
  pointsDelta: number;
}
/**
 * `job_eligible_members` narrows which members the matching engine may put on
 * a job. A job with NO row here is unrestricted — absence means "open to
 * everyone", not "nobody is eligible".
 */
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

/** One row created by the matching engine. */
export interface ApiMatchedAssignment {
  memberId: number;
  jobId: number;
  /** 1-based position of the job inside that member's own preference list. */
  rankAchieved: number;
  /** Points actually credited (already clamped to the 0-100 range). */
  pointsDelta: number;
}

/** Summary returned by `POST /events/:id/matching`. */
export interface ApiMatchingSummary {
  matched: ApiMatchedAssignment[];
  /** Available members the engine could not place anywhere. */
  unmatchedMemberIds: number[];
  /** Pre-existing locked rows, left untouched by the run. */
  locked: { memberId: number; jobId: number }[];
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

  /**
   * Deliberately NOT part of `loadAll()`: that round-trip is shared with
   * `RoleAssignmentStore`, which already over-fetches, and only the
   * coordination page needs the eligibility restrictions.
   */
  getJobEligibleMembers(): Observable<ApiJobEligibleMember[]> {
    return this.http.get<ApiJobEligibleMember[]>(`${this.baseUrl}/job-eligible-members`);
  }

  // Body keys are camelCase: apiCaseRequestInterceptor converts them to snake_case before sending.
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

  /**
   * Flip the `locked` flag of an EXISTING assignment, in place.
   *
   * The composite key travels in the query string — the row has no surrogate
   * id — while the body carries only the flag. `points_delta` is left alone by
   * the backend: it is the matching engine's bookkeeping, refunded when a row
   * is replaced, so a client must never overwrite it.
   */
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

  /**
   * Run the stable-matching engine for one event. Destructive: every
   * non-locked assignment of the event is deleted (and its points refunded)
   * before the new ones are written.
   */
  runMatching(eventId: number): Observable<ApiMatchingSummary> {
    return this.http.post<ApiMatchingSummary>(`${this.baseUrl}/events/${eventId}/matching`, {});
  }

  // Params are NOT converted by the interceptor — use snake_case explicitly.
  unassign(eventId: number, memberId: number, jobId: number): Observable<unknown> {
    return this.http.delete(`${this.baseUrl}/assignments`, {
      params: { member_id: memberId, event_id: eventId, job_id: jobId },
    });
  }

  createJob(name: string): Observable<ApiJob> {
    return this.http.post<ApiJob>(`${this.baseUrl}/jobs`, { name });
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

  updateJob(id: number, name: string): Observable<ApiJob> {
    return this.http.put<ApiJob>(`${this.baseUrl}/jobs/${id}`, { name });
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
