import { TestBed } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { firstValueFrom, isObservable } from 'rxjs';

import { sessionGuard } from './session.guard';
import { guestGuard } from './guest.guard';
import { SessionStore } from './session.store';

type Verdict = boolean | UrlTree;

function run(guard: typeof sessionGuard): Promise<Verdict> {
  const result = TestBed.runInInjectionContext(() =>
    guard(null as never, null as never),
  ) as unknown;

  if (!isObservable(result)) throw new Error('la garde doit rendre un observable');
  return firstValueFrom(result as never) as Promise<Verdict>;
}

const pathOf = (verdict: Verdict): string =>
  verdict instanceof UrlTree ? TestBed.inject(Router).serializeUrl(verdict) : '';

describe('gardes de session', () => {
  let store: SessionStore;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()],
    });
    store = TestBed.inject(SessionStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const resolveAs = (authenticated: boolean): void => {
    store.load();
    const request = http.expectOne((req) => req.url.endsWith('/account/profile'));

    if (authenticated) {
      request.flush({ user: { id: 7, email: 'client@enseirb.fr' }, member: null });
    } else {
      request.flush({ code: 'E_UNAUTHORIZED', message: 'nope' }, { status: 401, statusText: '' });
    }
  };

  /**
   * Le cas qui justifie l'existence de l'état `unknown` : au premier rendu, la
   * réponse de `/account/profile` n'est pas encore là. Trancher tout de suite
   * renverrait chaque F5 vers `/login`, cookie valide ou non.
   */
  it('sessionGuard ne tranche pas tant que la session est inconnue', async () => {
    let settled = false;
    void run(sessionGuard).then(() => (settled = true));

    await Promise.resolve();
    expect(settled).toBe(false);

    resolveAs(true);
    expect(await run(sessionGuard)).toBe(true);
  });

  it('sessionGuard renvoie vers /login un visiteur anonyme', async () => {
    resolveAs(false);
    expect(pathOf(await run(sessionGuard))).toBe('/login');
  });

  it('guestGuard laisse passer un visiteur anonyme', async () => {
    resolveAs(false);
    expect(await run(guestGuard)).toBe(true);
  });

  /**
   * Le symétrique : revenir sur `/login` en étant connecté proposerait un
   * aller-retour SSO complet pour rien.
   */
  it('guestGuard renvoie vers l’accueil un utilisateur déjà connecté', async () => {
    resolveAs(true);
    expect(pathOf(await run(guestGuard))).toBe('/');
  });
});
