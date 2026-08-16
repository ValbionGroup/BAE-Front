import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';

import { Login } from './login';
import { API_BASE_URL } from '#core/tokens/api-url.token';

function configure(ssoError: string | null) {
  return TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      provideMockStore({ initialState: { auth: {} } }),
      { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      {
        provide: ActivatedRoute,
        useValue: {
          queryParamMap: of(convertToParamMap(ssoError === null ? {} : { sso_error: ssoError })),
        },
      },
    ],
  }).compileComponents();
}

describe('Login', () => {
  let fixture: ComponentFixture<Login>;

  afterEach(() => TestBed.resetTestingModule());

  it('should create', async () => {
    await configure(null);
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('propose EirbConnect et non plus « ENT Bordeaux INP »', async () => {
    await configure(null);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('EirbConnect');
  });

  it('explique un refus « pas membre » plutôt que d’afficher un code brut', async () => {
    await configure('not_a_member');
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    await fixture.whenStable();

    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('n’est pas rattaché à un membre du BAE');
    // Le code technique ne doit jamais atteindre l'écran.
    expect(text).not.toContain('not_a_member');
  });

  it('n’affiche aucune alerte SSO en l’absence de code', async () => {
    await configure(null);
    fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    await fixture.whenStable();

    const alerts = (fixture.nativeElement as HTMLElement).querySelectorAll('[role="alert"]');
    expect(alerts.length).toBe(0);
  });
});
