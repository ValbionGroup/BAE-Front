import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MemberEditModal } from './member-edit-modal';
import { TeamStore } from '#core/store/team.store';
import { API_BASE_URL } from '#core/tokens/api-url.token';

const baseUrl = 'http://api.test/v1';

describe(MemberEditModal.name, () => {
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [MemberEditModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('offers only the grantable roles', async () => {
    const store = TestBed.inject(TeamStore);
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/members`).flush([
      {
        id: 2,
        firstName: 'Tommy',
        lastName: 'Klein',
        roleId: 1,
        points: 0,
        createdAt: null,
        updatedAt: null,
        role: { id: 1, name: 'Finance', createdAt: null, updatedAt: null },
      },
    ]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([
      { id: 1, name: 'Finance', createdAt: null, updatedAt: null, permissions: [] },
      { id: 2, name: 'Admin', createdAt: null, updatedAt: null, permissions: [] },
    ]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await loaded;

    const fixture = TestBed.createComponent(MemberEditModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('memberId', 2);
    fixture.componentRef.setInput('grantableRoleIds', [1]);
    await fixture.whenStable();

    const options = (fixture.nativeElement as HTMLElement).querySelectorAll('option');
    const labels = Array.from(options).map((option) => option.textContent?.trim());

    expect(labels).toContain('Finance');
    expect(labels).not.toContain('Admin');
  });
});
