import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { provideMockStore } from '@ngrx/store/testing';

import { Home } from './home';

describe(Home.name, () => {
  let component: Home;
  let fixture: ComponentFixture<Home>;
  let httpMock: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        provideMockStore({ initialState: { auth: {} } }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Home);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('loads every data source it renders, from its own ngOnInit', () => {
    // The home-data stores carry no withHooks({ onInit }) auto-load: the page
    // owns the loading, so injecting nine root stores fires nothing by itself.
    const paths = httpMock
      .match(() => true)
      .map((req) => new URL(req.request.url, 'http://localhost').pathname);

    for (const path of ['/v1/events', '/v1/stocks', '/v1/transactions']) {
      expect(paths).toContain(path);
    }

    // The activity feed is a domain-event trail, not a request log. Until the
    // backend provides one, it must render an explicit "unavailable" state
    // rather than dressing up /v1/logs as activity.
    expect(paths).not.toContain('/v1/logs');
  });

  it('renders skeletons while the stores are still loading', () => {
    expect(fixture.nativeElement.querySelectorAll('bfd-skeleton').length).toBeGreaterThan(0);
  });
});
