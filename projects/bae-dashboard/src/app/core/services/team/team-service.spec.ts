import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { TeamService } from './team-service';
import { API_BASE_URL } from '@bae/ui';

describe(TeamService.name, () => {
  let service: TeamService;
  let httpMock: HttpTestingController;
  const baseUrl = 'http://api.test/v1';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    service = TestBed.inject(TeamService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('requests the members endpoint', () => {
    service.getMembers().subscribe();
    httpMock.expectOne(`${baseUrl}/members`).flush([]);
  });

  it('requests the roles endpoint', () => {
    service.getRoles().subscribe();
    httpMock.expectOne(`${baseUrl}/roles`).flush([]);
  });

  it('requests the permissions endpoint', () => {
    service.getPermissions().subscribe();
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
  });

  it('requests the logs endpoint', () => {
    service.getLogs().subscribe();
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
  });
});
