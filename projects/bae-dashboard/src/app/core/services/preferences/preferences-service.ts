import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

export interface ApiJobPreference {
  jobId: number;
  name: string;
  preferenceRank: number;
}

export interface ApiPreferableJob {
  id: number;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class PreferencesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getMine(): Observable<ApiJobPreference[]> {
    return this.http.get<ApiJobPreference[]>(`${this.baseUrl}/account/preferences`);
  }

  getJobs(): Observable<ApiPreferableJob[]> {
    return this.http.get<ApiPreferableJob[]>(`${this.baseUrl}/account/preferences/jobs`);
  }

  saveMine(jobIds: readonly number[]): Observable<ApiJobPreference[]> {
    return this.http.put<ApiJobPreference[]>(`${this.baseUrl}/account/preferences`, {
      jobIds: [...jobIds],
    });
  }
}
