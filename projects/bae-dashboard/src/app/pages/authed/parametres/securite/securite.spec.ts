import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideStore } from '@ngrx/store';

import { ParametresSecurite } from './securite';

describe(ParametresSecurite.name, () => {
  let component: ParametresSecurite;
  let fixture: ComponentFixture<ParametresSecurite>;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ParametresSecurite],
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        // The current-session row dispatches the existing `[Auth] Logout`
        // action, so the component needs the NgRx store.
        provideStore({}),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ParametresSecurite);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    await fixture.whenStable();
  });

  afterEach(() => {
    // The page loads its sessions on init; answer it so nothing leaks.
    for (const req of http.match((r) => r.url.endsWith('/account/sessions'))) {
      req.flush([]);
    }
    http.verify();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
