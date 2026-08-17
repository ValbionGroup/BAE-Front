import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TransactionsService, type ApiTransaction } from './transactions-service';
import { API_BASE_URL } from '#core/tokens/api-url.token';

describe(TransactionsService.name, () => {
  let service: TransactionsService;
  let httpMock: HttpTestingController;
  let baseUrl: string;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(TransactionsService);
    httpMock = TestBed.inject(HttpTestingController);
    baseUrl = TestBed.inject(API_BASE_URL);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('GETs /transactions without params by default', async () => {
    const row: ApiTransaction = {
      id: 900001,
      type: 'cash',
      amount: 124.5,
      eventId: 10,
      orderIds: [900001],
      createdAt: '2026-07-06T23:29:21.775+00:00',
    };

    const promise = new Promise<ApiTransaction[]>((resolve) => service.getAll().subscribe(resolve));
    const req = httpMock.expectOne(`${baseUrl}/transactions`);
    expect(req.request.params.keys()).toEqual([]);
    req.flush([row]);

    expect(await promise).toEqual([row]);
  });

  it('sends the event filter as the snake_case `event_id` param', () => {
    service.getAll(10).subscribe();
    const req = httpMock.expectOne((r) => r.url === `${baseUrl}/transactions`);
    expect(req.request.params.get('event_id')).toBe('10');
    req.flush([]);
  });
});
