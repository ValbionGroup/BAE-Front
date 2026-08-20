import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpErrorResponse,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { apiEnvelopeInterceptor } from './api-envelope-interceptor';
import { API_BASE_URL } from '../../api-url.token';
import { PAGINATION, paginationContext } from '../../pagination';

describe('apiEnvelopeInterceptor', () => {
  const apiBaseUrl = 'http://api.test';
  let http: HttpClient;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([apiEnvelopeInterceptor])),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: apiBaseUrl },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should unwrap the data field on success', () => {
    let body: unknown;
    http.get(`${apiBaseUrl}/events`).subscribe((res) => (body = res));

    httpMock.expectOne(`${apiBaseUrl}/events`).flush({ data: [{ id: 1 }], meta: { total: 1 } });

    expect(body).toEqual([{ id: 1 }]);
  });

  it('should unwrap the error field on failure', () => {
    let caught: HttpErrorResponse | undefined;
    http.get(`${apiBaseUrl}/events`).subscribe({ error: (err) => (caught = err) });

    httpMock
      .expectOne(`${apiBaseUrl}/events`)
      .flush(
        { error: { code: 'NOT_FOUND', message: 'Event not found' } },
        { status: 404, statusText: 'Not Found' },
      );

    expect(caught?.error).toEqual({ code: 'NOT_FOUND', message: 'Event not found' });
    expect(caught?.status).toBe(404);
  });

  /**
   * Cet intercepteur voit la réponse avant la conversion de casse, et celle-ci
   * ne traite que le corps : sans conversion ici, l'appelant recevrait
   * `per_page` et lirait `undefined` sur `perPage`.
   */
  it('should expose pagination on the request context, in camelCase', () => {
    const context = paginationContext();
    http.get(`${apiBaseUrl}/logs`, { context }).subscribe();

    httpMock.expectOne(`${apiBaseUrl}/logs`).flush({
      data: [{ id: 1 }],
      metadata: { total: 320, per_page: 200, current_page: 1, last_page: 2 },
    });

    expect(context.get(PAGINATION)).toEqual({
      total: 320,
      perPage: 200,
      currentPage: 1,
      lastPage: 2,
    });
  });

  it('should leave the pagination null when the response carries none', () => {
    const context = paginationContext();
    http.get(`${apiBaseUrl}/events`, { context }).subscribe();

    httpMock.expectOne(`${apiBaseUrl}/events`).flush({ data: [{ id: 1 }] });

    expect(context.get(PAGINATION)).toBeNull();
  });

  it('should leave non-enveloped bodies untouched', () => {
    let body: unknown;
    http.get(`${apiBaseUrl}/raw`).subscribe((res) => (body = res));

    httpMock.expectOne(`${apiBaseUrl}/raw`).flush({ id: 1 });

    expect(body).toEqual({ id: 1 });
  });

  it('should ignore requests outside the API base url', () => {
    let body: unknown;
    http.get('http://other.test/file').subscribe((res) => (body = res));

    httpMock.expectOne('http://other.test/file').flush({ data: 'kept as-is' });

    expect(body).toEqual({ data: 'kept as-is' });
  });
});
