import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

/** One job the signed-in member has ranked. `preferenceRank` is 1-based. */
export interface ApiJobPreference {
  jobId: number;
  name: string;
  preferenceRank: number;
}

/** A job that can be ranked. */
export interface ApiPreferableJob {
  id: number;
  name: string;
}

/**
 * The signed-in member's own job ranking.
 *
 * The caller is implied by the token — no member id travels in the path — so
 * nobody can read or rewrite somebody else's preferences.
 */
@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getMine(): Observable<ApiJobPreference[]> {
    return this.http.get<ApiJobPreference[]>(`${this.baseUrl}/account/preferences`);
  }

  getJobs(): Observable<ApiPreferableJob[]> {
    return this.http.get<ApiPreferableJob[]>(`${this.baseUrl}/jobs`);
  }

  /**
   * Replace the ranking. The array is ORDERED — the backend derives each rank
   * from its position, so the client never sends rank numbers and cannot create
   * gaps, ties or duplicates.
   */
  saveMine(jobIds: readonly number[]): Observable<ApiJobPreference[]> {
    return this.http.put<ApiJobPreference[]>(`${this.baseUrl}/account/preferences`, {
      jobIds: [...jobIds],
    });
  }
}
