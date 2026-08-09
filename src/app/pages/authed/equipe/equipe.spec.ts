import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideMockStore, MockStore } from '@ngrx/store/testing';

import { Equipe } from './equipe';
import { API_BASE_URL } from '#core/tokens/api-url.token';
import { DropdownService } from '#shared/components/dropdown/dropdown.service';
import type { DropdownItemAction } from '#shared/components/dropdown/dropdown.models';

const baseUrl = 'http://api.test/v1';

/** The store's `load()` is a plain promise: it is not tracked by zoneless stability. */
async function flushAsync(fixture: ComponentFixture<Equipe>): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

describe(Equipe.name, () => {
  let component: Equipe;
  let fixture: ComponentFixture<Equipe>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Equipe],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_BASE_URL, useValue: baseUrl },
        provideMockStore({
          initialState: {
            auth: { permissions: ['role:read', 'role:write', 'member:write'], member: { id: 1 } },
          },
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Equipe);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('requests the four team endpoints on init', () => {
    httpMock.expectOne(`${baseUrl}/members`).flush([]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    httpMock.verify();
  });

  it('renders the member name and its role name, not the role object', async () => {
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
    httpMock.expectOne(`${baseUrl}/roles`).flush([{ id: 1, name: 'Finance', permissions: [] }]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([{ permission: 'stock:read' }]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await flushAsync(fixture);

    const text: string = fixture.nativeElement.textContent;
    expect(text).toContain('Tommy Klein');
    expect(text).toContain('Finance');
    expect(text).not.toContain('[object Object]');
    httpMock.verify();
  });

  it('shows a section error instead of an empty table', async () => {
    httpMock
      .expectOne(`${baseUrl}/members`)
      .flush(null, { status: 500, statusText: 'Server Error' });
    httpMock.expectOne(`${baseUrl}/roles`).flush([]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await flushAsync(fixture);

    expect(fixture.nativeElement.textContent).toContain('Impossible de charger les membres.');
    httpMock.verify();
  });

  /** Charge une matrice minimale : un seul rôle, occupé, porteur de `role:write`. */
  async function loadMatrix(): Promise<void> {
    httpMock.expectOne(`${baseUrl}/members`).flush([
      {
        id: 2,
        firstName: 'Tommy',
        lastName: 'Klein',
        roleId: 1,
        points: 0,
        createdAt: null,
        updatedAt: null,
        role: { id: 1, name: 'Administrateur', createdAt: null, updatedAt: null },
      },
    ]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([
      {
        id: 1,
        name: 'Administrateur',
        createdAt: null,
        updatedAt: null,
        permissions: [
          { permission: 'role:write', createdAt: null, updatedAt: null },
          { permission: 'role:read', createdAt: null, updatedAt: null },
          { permission: 'stock:read', createdAt: null, updatedAt: null },
        ],
      },
    ]);
    httpMock
      .expectOne(`${baseUrl}/permissions`)
      .flush([
        { permission: 'role:write' },
        { permission: 'role:read' },
        { permission: 'stock:read' },
      ]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await flushAsync(fixture);
  }

  it('protects the last living holder of role:write', async () => {
    await loadMatrix();

    expect(component['cellDisabled'](1, 'role:write')).toBe(true);
    expect(component['cellDisabled'](1, 'stock:read')).toBe(false);
    httpMock.verify();
  });

  it('protects the last living holder of role:read', async () => {
    // Mirrors the role:write case: role:read gates this very page, GET /roles,
    // GET /permissions and the sidebar entry, so it must be just as protected.
    await loadMatrix();

    expect(component['cellDisabled'](1, 'role:read')).toBe(true);
    httpMock.verify();
  });

  it('disables every cell when the member cannot write roles', async () => {
    await loadMatrix();

    TestBed.inject(MockStore).setState({ auth: { permissions: ['role:read'] } });
    fixture.detectChanges();

    expect(component['cellDisabled'](1, 'stock:read')).toBe(true);
    httpMock.verify();
  });

  it('disables the action menu without member:write', async () => {
    TestBed.inject(MockStore).setState({
      auth: { permissions: ['role:read'], member: { id: 1 } },
    });

    httpMock.expectOne(`${baseUrl}/members`).flush([
      {
        id: 2,
        firstName: 'Tommy',
        lastName: 'Klein',
        roleId: null,
        points: 0,
        createdAt: null,
        updatedAt: null,
        role: null,
      },
    ]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await flushAsync(fixture);

    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="member-actions"]',
    );
    expect(trigger?.disabled).toBe(true);
  });

  it('refuses to act on a member holding permissions the actor lacks', async () => {
    TestBed.inject(MockStore).setState({
      auth: { permissions: ['member:write'], member: { id: 1 } },
    });

    httpMock.expectOne(`${baseUrl}/members`).flush([
      {
        id: 2,
        firstName: 'Ada',
        lastName: 'Admin',
        roleId: 9,
        points: 0,
        createdAt: null,
        updatedAt: null,
        role: { id: 9, name: 'Admin', createdAt: null, updatedAt: null },
      },
    ]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([
      {
        id: 9,
        name: 'Admin',
        createdAt: null,
        updatedAt: null,
        permissions: [{ permission: 'role:write', createdAt: null, updatedAt: null }],
      },
    ]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await flushAsync(fixture);

    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="member-actions"]',
    );
    expect(trigger?.disabled).toBe(true);
  });

  it('enables the action menu for a member the actor is allowed to act on', async () => {
    // Positive counterpart to the two refusal tests above: without this, a
    // regressed mirror (inverted boolean, `canWriteMembers` stuck at false,
    // `canActOn` always true or always false) would pass every test in this
    // file in silence.
    TestBed.inject(MockStore).setState({
      auth: { permissions: ['member:write'], member: { id: 1 } },
    });

    httpMock.expectOne(`${baseUrl}/members`).flush([
      {
        id: 2,
        firstName: 'Tommy',
        lastName: 'Klein',
        roleId: null,
        points: 0,
        createdAt: null,
        updatedAt: null,
        role: null,
      },
    ]);
    httpMock.expectOne(`${baseUrl}/roles`).flush([]);
    httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
    httpMock.expectOne(`${baseUrl}/logs`).flush([]);
    await flushAsync(fixture);

    const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
      '[data-testid="member-actions"]',
    );
    // Existence first: on an absent element `trigger?.disabled` is `undefined`,
    // and `expect(undefined).toBe(false)` would fail for the wrong reason.
    expect(trigger).not.toBeNull();
    expect(trigger?.disabled).toBe(false);
  });

  /**
   * The layer connecting the store to the dropdown menu — openMemberMenu,
   * confirmDelete, lockedMemberIds — was never exercised by any test: the
   * store and the modal are covered in isolation, but nothing drives the
   * click that wires them together. These three tests click the real
   * trigger and read the real `DropdownService`, covering both refusal
   * reasons for "Supprimer" and the enabled case — without the positive
   * case, an inverted `disabled` could pass unnoticed.
   */
  describe('"Supprimer" item in the actions dropdown', () => {
    function findSupprimer(): DropdownItemAction {
      const dropdown = TestBed.inject(DropdownService).current();
      const item = dropdown?.items.find(
        (entry): entry is DropdownItemAction => entry.type === 'action' && entry.label === 'Supprimer',
      );
      if (!item) throw new Error('"Supprimer" item not found in the open dropdown');
      return item;
    }

    it('is disabled with a self-delete reason when the actor targets themselves', async () => {
      TestBed.inject(MockStore).setState({
        auth: { permissions: ['member:write'], member: { id: 2 } },
      });

      httpMock.expectOne(`${baseUrl}/members`).flush([
        {
          id: 2,
          firstName: 'Tommy',
          lastName: 'Klein',
          roleId: null,
          points: 0,
          createdAt: null,
          updatedAt: null,
          role: null,
        },
      ]);
      httpMock.expectOne(`${baseUrl}/roles`).flush([]);
      httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
      httpMock.expectOne(`${baseUrl}/logs`).flush([]);
      await flushAsync(fixture);

      const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '[data-testid="member-actions"]',
      );
      expect(trigger?.disabled).toBe(false);
      trigger?.click();

      const supprimer = findSupprimer();
      expect(supprimer.disabled).toBe(true);
      expect(supprimer.description).toBe('Vous ne pouvez pas supprimer votre propre compte.');
      httpMock.verify();
    });

    it('is disabled with a lockout reason for the last living holder of a protected permission', async () => {
      // The actor needs everything the target's role grants (rule 1) to reach
      // the dropdown at all — role:write/role:read/stock:read here — plus
      // member:write, or the trigger itself would be disabled and the click
      // would never open anything.
      TestBed.inject(MockStore).setState({
        auth: {
          permissions: ['member:write', 'role:write', 'role:read', 'stock:read'],
          member: { id: 1 },
        },
      });

      await loadMatrix();

      const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '[data-testid="member-actions"]',
      );
      expect(trigger?.disabled).toBe(false);
      trigger?.click();

      const supprimer = findSupprimer();
      expect(supprimer.disabled).toBe(true);
      expect(supprimer.description).toBe('Dernier porteur d’une permission d’administration.');
      httpMock.verify();
    });

    it('is enabled with no description for an ordinary refusal-free target', async () => {
      // Positive counterpart to the two refusal cases above: without it, an
      // inverted `disabled` (always true) would pass both tests above and go
      // unnoticed.
      TestBed.inject(MockStore).setState({
        auth: { permissions: ['member:write'], member: { id: 1 } },
      });

      httpMock.expectOne(`${baseUrl}/members`).flush([
        {
          id: 2,
          firstName: 'Tommy',
          lastName: 'Klein',
          roleId: null,
          points: 0,
          createdAt: null,
          updatedAt: null,
          role: null,
        },
      ]);
      httpMock.expectOne(`${baseUrl}/roles`).flush([]);
      httpMock.expectOne(`${baseUrl}/permissions`).flush([]);
      httpMock.expectOne(`${baseUrl}/logs`).flush([]);
      await flushAsync(fixture);

      const trigger = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>(
        '[data-testid="member-actions"]',
      );
      expect(trigger?.disabled).toBe(false);
      trigger?.click();

      const supprimer = findSupprimer();
      expect(supprimer.disabled).toBe(false);
      expect(supprimer.description).toBeUndefined();
      httpMock.verify();
    });
  });
});
