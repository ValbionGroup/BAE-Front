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

  it('selects the member current role in the DOM on first render', async () => {
    const store = TestBed.inject(TeamStore);
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/members`).flush([
      {
        id: 3,
        firstName: 'Alix',
        lastName: 'Roy',
        roleId: 2,
        points: 0,
        createdAt: null,
        updatedAt: null,
        role: { id: 2, name: 'Admin', createdAt: null, updatedAt: null },
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
    fixture.componentRef.setInput('memberId', 3);
    fixture.componentRef.setInput('grantableRoleIds', [1, 2]);
    await fixture.whenStable();

    // Regression guard: with only `[value]` on <select> and no `[selected]` on the
    // <option>s, Ivy applies the element's property binding before its @for-created
    // children exist. The browser then finds no matching <option> and silently falls
    // back to the first one — the static "Sans rôle" — even though the member has a
    // role. Assert on the DOM's own selection state, not a component signal, so this
    // mismatch between model and rendered DOM can't hide.
    const select = (fixture.nativeElement as HTMLElement).querySelector('select');
    expect(select?.value).toBe('2');

    // `.selected` is a DOM property, not a reflected HTML attribute — an
    // attribute selector like `option[selected]` would silently match nothing
    // even when Angular's `[selected]` binding worked, so read the property.
    const options = Array.from(select?.querySelectorAll('option') ?? []);
    const selectedOption = options.find((option) => option.selected);
    expect(selectedOption?.value).toBe('2');
    expect(selectedOption?.textContent?.trim()).toBe('Admin');
  });

  it('locks the role select and states why when this member is the last living holder', async () => {
    const store = TestBed.inject(TeamStore);
    const loaded = store.load();
    httpMock.expectOne(`${baseUrl}/members`).flush([
      {
        id: 4,
        firstName: 'Ada',
        lastName: 'Admin',
        roleId: 9,
        points: 0,
        createdAt: null,
        updatedAt: null,
        role: { id: 9, name: 'Admin', createdAt: null, updatedAt: null },
      },
    ]);
    httpMock
      .expectOne(`${baseUrl}/roles`)
      .flush([{ id: 9, name: 'Admin', createdAt: null, updatedAt: null, permissions: [] }]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await loaded;

    const fixture = TestBed.createComponent(MemberEditModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('memberId', 4);
    fixture.componentRef.setInput('grantableRoleIds', [9]);
    fixture.componentRef.setInput('roleLocked', true);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const select = root.querySelector('select');
    expect(select?.disabled).toBe(true);
    // The reason must be readable text in the DOM, not just a `title` attribute
    // that a screen reader would never announce.
    expect(root.textContent).toContain('Dernier porteur d’une permission d’administration');
  });

  it('leaves the role select usable when this member is not the last living holder', async () => {
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
    httpMock
      .expectOne(`${baseUrl}/roles`)
      .flush([{ id: 1, name: 'Finance', createdAt: null, updatedAt: null, permissions: [] }]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await loaded;

    const fixture = TestBed.createComponent(MemberEditModal);
    fixture.componentRef.setInput('id', 'modal-1');
    fixture.componentRef.setInput('memberId', 2);
    fixture.componentRef.setInput('grantableRoleIds', [1]);
    fixture.componentRef.setInput('roleLocked', false);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    const select = root.querySelector('select');
    expect(select).not.toBeNull();
    expect(select?.disabled).toBe(false);
    expect(root.textContent).not.toContain('Dernier porteur d’une permission d’administration');
  });
});
