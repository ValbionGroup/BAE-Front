import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter, Router, UrlTree, type CanActivateFn } from '@angular/router';
import { Observable } from 'rxjs';

import { authGuard } from './auth-guard';
import { guestGuard } from './guest-guard';
import { AppRoutes } from '#app/app-routes.const';
import type { AuthState } from '#core/models/auth/auth-state.model';

/** `provideMockStore` émet à la souscription : les assertions restent synchrones. */
function run(guard: CanActivateFn, url = '/stocks'): unknown {
  let result: unknown = 'PAS_EMIS';
  TestBed.runInInjectionContext(() => {
    (guard(null as never, { url } as never) as Observable<boolean | UrlTree>).subscribe((value) => {
      result = value;
    });
  });
  return result;
}

function configure(auth: AuthState) {
  TestBed.configureTestingModule({
    providers: [provideMockStore({ initialState: { auth } }), provideRouter([])],
  });
}

describe('authGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('laisse passer un utilisateur authentifié', () => {
    configure({ user: { id: 1 } as never, permissions: [] });

    expect(run(authGuard)).toBe(true);
  });

  it('renvoie vers la connexion en conservant la destination', () => {
    configure({ permissions: [] });
    const router = TestBed.inject(Router);

    expect(run(authGuard, '/stocks')).toEqual(
      router.createUrlTree([AppRoutes.login], { queryParams: { redirectTo: '/stocks' } }),
    );
  });

  /**
   * ⚠️ Le test central de la bascule sur le cookie. Le jeton n'étant plus lisible
   * côté client, le garde **ne doit rien décider** avant que `/account/profile`
   * ait répondu — sinon un simple F5 déconnecte l'utilisateur.
   */
  it('ne décide pas tant que le profil n’a pas répondu', () => {
    configure({});

    expect(run(authGuard)).toBe('PAS_EMIS');
  });
});

describe('guestGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('laisse passer un visiteur', () => {
    configure({ permissions: [] });

    expect(run(guestGuard)).toBe(true);
  });

  it('renvoie un utilisateur déjà connecté vers l’accueil', () => {
    configure({ user: { id: 1 } as never, permissions: [] });
    const router = TestBed.inject(Router);

    expect(run(guestGuard)).toEqual(router.createUrlTree([AppRoutes.home]));
  });

  it('ne décide pas tant que le profil n’a pas répondu', () => {
    configure({});

    expect(run(guestGuard)).toBe('PAS_EMIS');
  });
});
