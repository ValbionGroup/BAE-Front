import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '@bae/ui';

import { CoordinationService, type ApiJob, type ApiMatchingSummary } from './coordination-service';

describe(CoordinationService.name, () => {
  let service: CoordinationService;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CoordinationService);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('deserializes GET /jobs with the period type each job now carries', () => {
    let jobs: ApiJob[] = [];
    service.loadAll().subscribe((data) => (jobs = data.jobs));

    httpMock.expectOne(`${baseUrl}/events`).flush([]);
    httpMock.expectOne(`${baseUrl}/members`).flush([]);
    httpMock.expectOne(`${baseUrl}/jobs`).flush([{ id: 1, name: 'Barman', type: 'during' }]);
    httpMock.expectOne(`${baseUrl}/event-jobs`).flush([]);
    httpMock.expectOne(`${baseUrl}/assignments`).flush([]);
    httpMock.expectOne(`${baseUrl}/responses`).flush([]);
    httpMock.expectOne(`${baseUrl}/preferences`).flush([]);

    expect(jobs).toEqual([{ id: 1, name: 'Barman', type: 'during' }]);
  });

  it('deserializes POST /events/:id/matching with a period per row and a nullable rankAchieved', () => {
    let summary: ApiMatchingSummary | undefined;
    service.runMatching(7).subscribe((s) => (summary = s));

    const req = httpMock.expectOne(`${baseUrl}/events/7/matching`);
    expect(req.request.method).toBe('POST');
    req.flush({
      matched: [{ memberId: 1, jobId: 2, period: 'before', rankAchieved: null, pointsDelta: 4 }],
      unmatchedMemberIds: [5],
      // A null period is only reachable for an orphaned locked row (its job
      // got deleted while the assignment still referenced it) — must not be
      // assumed present.
      locked: [{ memberId: 3, jobId: 9, period: null }],
    });

    expect(summary?.matched).toEqual([
      { memberId: 1, jobId: 2, period: 'before', rankAchieved: null, pointsDelta: 4 },
    ]);
    expect(summary?.unmatchedMemberIds).toEqual([5]);
    expect(summary?.locked).toEqual([{ memberId: 3, jobId: 9, period: null }]);
  });
});
