import { TestBed } from '@angular/core/testing';
import {
  HttpClient,
  HttpInterceptorFn,
  provideHttpClient,
  withInterceptors,
} from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { API_BASE_URL } from '../../api-url.token';
import { apiResponseCaseInterceptor } from './api-case-response-interceptor';

describe('apiResponseCaseInterceptor', () => {
  const interceptor: HttpInterceptorFn = (req, next) =>
    TestBed.runInInjectionContext(() => apiResponseCaseInterceptor(req, next));

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        { provide: API_BASE_URL, useValue: 'http://api.test' },
        provideHttpClient(withInterceptors([apiResponseCaseInterceptor])),
        provideHttpClientTesting(),
      ],
    });
  });

  it('should be created', () => {
    expect(interceptor).toBeTruthy();
  });

  it('passes a Blob body through untouched instead of emptying it', async () => {
    const http = TestBed.inject(HttpClient);
    const backend = TestBed.inject(HttpTestingController);
    const blob = new Blob(['%PDF-1.4 fake pdf bytes'], { type: 'application/pdf' });

    const promise = new Promise<Blob>((resolve) => {
      http.get('http://api.test/events/1/shopping-list/pdf', { responseType: 'blob' }).subscribe({
        next: (body) => resolve(body),
      });
    });

    backend.expectOne('http://api.test/events/1/shopping-list/pdf').flush(blob);
    const result = await promise;

    expect(result instanceof Blob).toBe(true);
    expect(result.size).toBe(blob.size);
    backend.verify();
  });
});
