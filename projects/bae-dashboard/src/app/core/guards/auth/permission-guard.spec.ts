import { TestBed } from '@angular/core/testing';
import { MockStore, provideMockStore } from '@ngrx/store/testing';
import { Router, UrlTree, type CanActivateFn } from '@angular/router';
import { Observable } from 'rxjs';

import { permissionGuard, permissionGuardAny } from './permission-guard';
import { AppRoutes } from '#app/app-routes.const';
import { permissionFor } from '#core/auth/route-permissions';

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

/**
 * ⚠️ `permissionFor` alimente **deux** consommateurs : le garde de route et
 * `Sidebar.visible()`. Une règle « au moins une » réservée au garde laisserait
 * le menu en désaccord avec la page — entrée visible pour qui ne peut pas
 * entrer, ou l'inverse. Elle vit donc dans la source, pas dans ses lecteurs.
 */
describe('permissionFor', () => {
  it('rend un tableau d’un élément pour une route à permission unique', () => {
    expect(permissionFor(AppRoutes.stocks)).toEqual(['stock:read']);
  });

  it('rend la liste entière pour une route qui en accepte plusieurs', () => {
    expect(permissionFor(AppRoutes.referentiels)).toEqual([
      'category:read',
      'supplier:read',
      'job:read',
      'product:read',
    ]);
  });

  it('rend un tableau vide pour une route non gardée', () => {
    expect(permissionFor(AppRoutes.analyse)).toEqual([]);
  });
});

describe('permissionGuardAny', () => {
  it('laisse passer qui ne porte qu’une des permissions attendues', () => {
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: { auth: { permissions: ['job:read'] } } })],
    });

    expect(run(permissionGuardAny(['category:read', 'supplier:read', 'job:read']))).toBe(true);
  });

  it('refuse qui n’en porte aucune', () => {
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: { auth: { permissions: ['stock:read'] } } })],
    });
    const router = TestBed.inject(Router);

    expect(run(permissionGuardAny(['category:read', 'supplier:read', 'job:read']))).toEqual(
      router.createUrlTree([AppRoutes.home]),
    );
  });

  /** Une liste vide = route non gardée : laisser passer, ne pas tout refuser. */
  it('laisse passer quand aucune permission n’est exigée', () => {
    TestBed.configureTestingModule({
      providers: [provideMockStore({ initialState: { auth: { permissions: [] } } })],
    });

    expect(run(permissionGuardAny([]))).toBe(true);
  });
});
