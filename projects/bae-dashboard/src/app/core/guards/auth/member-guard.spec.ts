import { TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';

import { memberGuard } from './member-guard';
import { AppRoutes } from '#app/app-routes.const';
import type { AuthState } from '#core/models/auth/auth-state.model';
import type { MemberModel, UserModel } from '#core/models/user.model';

const USER = { id: 1 } as UserModel;
const MEMBER = { id: 7 } as MemberModel;

/** `provideMockStore` émet à la souscription : les assertions restent synchrones. */
function run(): unknown {
  let result: unknown = 'PAS_EMIS';
  TestBed.runInInjectionContext(() => {
    (memberGuard(null as never, null as never) as Observable<boolean | UrlTree>).subscribe(
      (value) => {
        result = value;
      },
    );
  });
  return result;
}

function configure(auth: AuthState) {
  TestBed.configureTestingModule({
    providers: [provideMockStore({ initialState: { auth } }), provideRouter([])],
  });
}

describe('memberGuard', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('laisse passer un membre, même sans aucune permission', () => {
    configure({ user: USER, member: MEMBER, permissions: [] });

    expect(run()).toBe(true);
  });

  /**
   * Le cœur du garde : les deux zones partagent le cookie de session, donc un
   * adhérent connecté à la zone publique arrive ici avec un `user` parfaitement
   * valide. Seul `member` le distingue.
   */
  it('renvoie vers l’accès refusé un compte authentifié sans membre rattaché', () => {
    configure({ user: USER, member: null, permissions: [] });
    const router = TestBed.inject(Router);

    expect(run()).toEqual(router.createUrlTree([AppRoutes.accesRefuse]));
  });

  /** `authGuard` court-circuite avant : à ce garde de ne pas doubler la décision. */
  it('s’abstient quand personne n’est connecté', () => {
    configure({ permissions: [] });

    expect(run()).toBe(true);
  });

  it('ne décide pas tant que le profil n’a pas répondu', () => {
    configure({});

    expect(run()).toBe('PAS_EMIS');
  });
});
