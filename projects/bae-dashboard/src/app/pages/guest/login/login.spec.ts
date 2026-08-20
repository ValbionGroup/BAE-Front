import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { Login } from './login';
import { API_BASE_URL, ExternalNavigation } from '@bae/ui';

function configure(ssoError: string | null) {
  return TestBed.configureTestingModule({
    imports: [Login],
    providers: [
      provideMockStore({ initialState: { auth: {} } }),
      provideHttpClient(),
      provideHttpClientTesting(),
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

  // `app=dashboard` est la seule partie propre à cette zone, et le back refuse
  // toute autre valeur : la recopier depuis le front public casse la connexion.
  it('part vers l’IdP en annonçant la zone dashboard', async () => {
    await configure(null);
    const go = vi.spyOn(TestBed.inject(ExternalNavigation), 'go').mockImplementation(() => {});
    fixture = TestBed.createComponent(Login);
    await fixture.whenStable();

    (
      fixture.componentInstance as unknown as { loginWithEirbConnect(): void }
    ).loginWithEirbConnect();

    expect(go).toHaveBeenCalledWith('http://api.test/v1/auth/keycloak/redirect?app=dashboard');
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

  describe('statut des services', () => {
    let httpMock: HttpTestingController;

    async function render() {
      await configure(null);
      httpMock = TestBed.inject(HttpTestingController);
      fixture = TestBed.createComponent(Login);
      fixture.detectChanges();
      await fixture.whenStable();
    }

    function text(): string {
      return (fixture.nativeElement as HTMLElement).textContent ?? '';
    }

    async function settle() {
      fixture.detectChanges();
      await fixture.whenStable();
    }

    it('n’annonce rien d’opérationnel tant que l’API n’a pas répondu', async () => {
      await render();

      // Le cœur de la demande : ce libellé était écrit en dur et donc toujours
      // vrai. Avant la réponse, il ne doit pas apparaître.
      expect(text()).not.toContain('opérationnels');
      expect(text()).toContain('Vérification des services');

      httpMock.expectOne('http://api.test/').flush({ health: true, status: 'ok' });
    });

    it('annonce les services opérationnels quand l’API répond', async () => {
      await render();

      httpMock.expectOne('http://api.test/').flush({ health: true, status: 'ok' });
      await settle();

      expect(text()).toContain('Tous les services sont opérationnels');
    });

    it('annonce un service dégradé quand l’API se déclare en panne', async () => {
      await render();

      httpMock
        .expectOne('http://api.test/')
        .flush(
          { health: false, status: 'error', problems: [{ name: 'database', message: 'down' }] },
          { status: 503, statusText: 'Service Unavailable' },
        );
      await settle();

      expect(text()).toContain('Service dégradé');
      expect(text()).not.toContain('opérationnels');
    });

    it('annonce une API injoignable quand elle ne répond pas', async () => {
      await render();

      httpMock.expectOne('http://api.test/').error(new ProgressEvent('error'));
      await settle();

      expect(text()).toContain('API injoignable');
      expect(text()).not.toContain('opérationnels');
    });

    it('fait pulser le point, sans l’imposer à qui a demandé moins d’animation', async () => {
      await render();

      httpMock.expectOne('http://api.test/').flush({ health: true, status: 'ok' });
      await settle();

      const halo = (fixture.nativeElement as HTMLElement).querySelector('.animate-ping');
      expect(halo).not.toBeNull();
      expect(halo?.classList.contains('motion-reduce:hidden')).toBe(true);
    });

    it('teinte le halo comme le point, statut par statut', async () => {
      await render();

      httpMock
        .expectOne('http://api.test/')
        .flush(
          { health: false, status: 'error' },
          { status: 503, statusText: 'Service Unavailable' },
        );
      await settle();

      const halo = (fixture.nativeElement as HTMLElement).querySelector('.animate-ping');
      // La classe liée doit s'ajouter aux classes statiques, pas les remplacer.
      expect(halo?.classList.contains('bg-warn')).toBe(true);
      expect(halo?.classList.contains('rounded-full')).toBe(true);
    });

    it('expose le statut comme une région live, puisqu’il change après le rendu', async () => {
      await render();

      const region = (fixture.nativeElement as HTMLElement).querySelector('[role="status"]');
      expect(region).not.toBeNull();
      expect(region?.getAttribute('aria-live')).toBe('polite');

      httpMock.expectOne('http://api.test/').flush({ health: true, status: 'ok' });
    });
  });
});
