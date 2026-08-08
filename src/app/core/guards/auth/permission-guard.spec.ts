import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router, UrlTree, type CanActivateFn } from '@angular/router';
import { Observable } from 'rxjs';

import { permissionGuard } from './permission-guard';
import { AppRoutes } from '#app/app-routes.const';

// `provideMockStore` emits synchronously on subscribe, so capturing the
// value inside `.subscribe()` keeps these assertions synchronous.
function run(guard: CanActivateFn): unknown {
  let result: unknown;
  TestBed.runInInjectionContext(() => {
    (guard(null as never, { url: '/equipe' } as never) as Observable<boolean | UrlTree>).subscribe(
      (value) => {
        result = value;
      },
    );
  });
  return result;
}

describe('permissionGuard', () => {
  it('lets a holder through', () => {
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: { auth: { permissions: ['role:read'] } } })],
    });

    expect(run(permissionGuard('role:read'))).toBe(true);
  });

  it('sends a member without the permission back to the home page', () => {
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: { auth: { permissions: ['presence:read'] } } })],
    });
    const router = TestBed.inject(Router);

    // `AppRoutes.home` vaut `''`, pas `'/'` : comparer à la constante, sinon
    // l'`UrlTree` attendu n'est pas celui que le garde construit.
    expect(run(permissionGuard('role:read'))).toEqual(router.createUrlTree([AppRoutes.home]));
  });

  it('waits for the profile to settle before deciding, then grants once it does', () => {
    // `provideAppInitializer` ne bloque pas le routage : au premier rendu,
    // `permissions` peut encore être absent. Le garde ne doit ni refuser ni
    // accorder tant que le profil n'a pas répondu — il doit attendre.
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: { auth: {} } })],
    });
    const store = TestBed.inject(MockStore);

    let result: unknown;
    let settled = false;
    TestBed.runInInjectionContext(() => {
      (
        permissionGuard('role:read')(null as never, { url: '/equipe' } as never) as Observable<
          boolean | UrlTree
        >
      ).subscribe((value) => {
        result = value;
        settled = true;
      });
    });

    expect(settled).toBe(false);

    store.setState({ auth: { permissions: ['role:read'] } });

    expect(settled).toBe(true);
    expect(result).toBe(true);
  });
});
