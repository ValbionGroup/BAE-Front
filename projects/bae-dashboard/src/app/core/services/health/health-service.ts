import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, catchError, map, of } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';
import { HealthReport, ServiceStatus, isHealthReport } from '#core/models/health.model';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly http = inject(HttpClient);

  private readonly healthUrl = new URL('/', inject(API_BASE_URL)).toString();

  check(): Observable<ServiceStatus> {
    return this.http.get<HealthReport>(this.healthUrl).pipe(
      map((report): ServiceStatus => (report.health ? 'ok' : 'degraded')),
      catchError((error: HttpErrorResponse) =>
        of<ServiceStatus>(isHealthReport(error.error) ? 'degraded' : 'down'),
      ),
    );
  }
}
