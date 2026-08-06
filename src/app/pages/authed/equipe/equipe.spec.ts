import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Equipe } from './equipe';
import { API_BASE_URL } from '#core/tokens/api-url.token';

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
    httpMock.expectOne(`${baseUrl}/roles`).flush([{ id: 1, name: 'Finance' }]);
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
});
