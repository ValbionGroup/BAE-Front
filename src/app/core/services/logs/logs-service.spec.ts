import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LogsService, type ApiLog } from './logs-service';
import { API_BASE_URL } from '#core/tokens/api-url.token';

describe(LogsService.name, () => {
  let service: LogsService;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(LogsService);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GETs /logs and passes the rows through', async () => {
    const row: ApiLog = {
      id: 1,
      level: 'info',
      message: 'POST /v1/events → 200 (13ms)',
      method: 'POST',
      url: '/v1/events',
      ip: '127.0.0.1',
      userId: 1,
      createdAt: '2026-07-08T20:33:03.711+00:00',
      user: { id: 1, casId: 'lespiet', email: 'lespiet@bordeaux-inp.fr' },
    };

    const promise = new Promise<ApiLog[]>((resolve) => service.getAll().subscribe(resolve));
    httpMock.expectOne(`${baseUrl}/logs`).flush([row]);

    expect(await promise).toEqual([row]);
  });
});
