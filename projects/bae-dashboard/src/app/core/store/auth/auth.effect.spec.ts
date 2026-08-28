import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { Action } from '@ngrx/store';
import { firstValueFrom, Observable, of, Subject } from 'rxjs';
import { vi } from 'vitest';

import { AuthEffects } from './auth.effect';
import { API_BASE_URL, ExternalNavigation, ThemeService } from '@bae/ui';
import * as AuthActions from './auth.actions';
import { AppRoutes } from '#app/app-routes.const';

// L'environnement de test ne fournit pas de vrai `localStorage` (Node expose un
// stub incomplet sans `setItem`) : on le remplace par une implémentation en
// mémoire pour ce fichier uniquement.
class MemoryStorage implements Storage {
  private store = new Map<string, string>();
  get length(): number {
    return this.store.size;
  }
  clear(): void {
    this.store.clear();
  }
  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }
  key(index: number): string | null {
    return Array.from(this.store.keys())[index] ?? null;
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
}

describe(AuthEffects.name, () => {
  let effects: AuthEffects;
  let actions$: Observable<Action>;

  beforeEach(() => {
    vi.stubGlobal('localStorage', new MemoryStorage());
    TestBed.configureTestingModule({
      providers: [
        AuthEffects,
        provideMockActions(() => actions$),
        provideMockStore({ initialState: { auth: {} } }),
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_BASE_URL, useValue: 'http://api.test/v1' },
      ],
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('should be created', () => {
    actions$ = of();
    effects = TestBed.inject(AuthEffects);
    expect(effects).toBeTruthy();
  });

  /**
   * ⚠️ La déconnexion n'est plus une requête mais une **navigation**, symétrique
   * du bouton EirbConnect. Un XHR ne peut pas fermer la session de l'IdP : le
   * navigateur doit suivre la redirection vers Keycloak, sinon recliquer « SSO »
   * reconnecte sans mot de passe — la fuite que ce lot corrige.
   */
  it('quitte l’application vers la déconnexion globale', async () => {
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const navigation = TestBed.inject(ExternalNavigation);
    vi.spyOn(navigation, 'go').mockImplementation(() => undefined);
    const httpMock = TestBed.inject(HttpTestingController);

    const result = firstValueFrom(effects.logout$);
    actionsSubject.next(AuthActions.logout());
    await result;

    // La zone voyage en mot-clé, jamais en URL : le serveur seul résout la
    // destination de retour.
    expect(navigation.go).toHaveBeenCalledWith(
      'http://api.test/v1/auth/keycloak/logout?app=dashboard',
    );
    httpMock.verify();
  });

  /**
   * Le `localStorage.clear()` a disparu avec le jeton qu'il servait à effacer —
   * et avec lui le contournement qui préservait la préférence de thème. Ce test
   * garde le fait que la déconnexion **ne touche plus au stockage local du
   * tout** : y remettre un `clear()` réinitialiserait le thème à chaque
   * déconnexion, ce qui était précisément le bug corrigé au §0 decies.
   */
  it('ne touche pas au stockage local', async () => {
    localStorage.setItem(ThemeService.STORAGE_KEY, 'dark');
    localStorage.setItem('une_autre_cle', 'doit-survivre');

    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    vi.spyOn(TestBed.inject(ExternalNavigation), 'go').mockImplementation(() => undefined);

    const result = firstValueFrom(effects.logout$);
    actionsSubject.next(AuthActions.logout());
    await result;

    expect(localStorage.getItem(ThemeService.STORAGE_KEY)).toBe('dark');
    expect(localStorage.getItem('une_autre_cle')).toBe('doit-survivre');
  });

  /**
   * ⚠️ Le défaut le plus probable de tout le lot de la 2FA. `E_TWO_FACTOR_REQUIRED`
   * arrive sur le **même** `catchError` que de vrais identifiants erronés : traité
   * comme tel, la page de connexion afficherait « Identifiants incorrects. » sur un
   * mot de passe correct, et n'irait jamais vers l'écran du code.
   */
  it('traite une demande de second facteur autrement qu’un échec de connexion', async () => {
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const httpMock = TestBed.inject(HttpTestingController);

    const result = firstValueFrom(effects.login$);
    actionsSubject.next(AuthActions.loginStart({ email: 'a@b.c', password: 'motdepasse' }));

    httpMock
      .expectOne('http://api.test/v1/auth/login')
      .flush(
        { code: 'E_TWO_FACTOR_REQUIRED', message: 'Second facteur requis.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(await result).toEqual(AuthActions.twoFactorRequired());
    // Aucun appel de profil : il n'y a pas de session à lire.
    httpMock.verify();
  });

  it('traite un vrai refus d’identifiants comme un échec de connexion', async () => {
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const httpMock = TestBed.inject(HttpTestingController);

    const result = firstValueFrom(effects.login$);
    actionsSubject.next(AuthActions.loginStart({ email: 'a@b.c', password: 'faux' }));

    httpMock
      .expectOne('http://api.test/v1/auth/login')
      .flush(
        { code: 'E_INVALID_CREDENTIALS', message: 'Identifiants invalides.' },
        { status: 401, statusText: 'Unauthorized' },
      );

    expect(await result).toEqual(
      AuthActions.loginFailure({
        error: { code: 'E_INVALID_CREDENTIALS', message: 'Identifiants invalides.' },
      }),
    );
    httpMock.verify();
  });

  /**
   * ⚠️ Sans repli, `navigateByUrl(undefined)` lève. Le cas s'atteint en tapant
   * `/login` directement — donc sans rebond d'`authGuard`, donc sans `redirectTo` —
   * et le saut par l'écran du code le rend courant.
   */
  it('retombe sur l’accueil quand aucune destination n’était demandée', async () => {
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

    const result = firstValueFrom(effects.loginSuccess$);
    actionsSubject.next(
      AuthActions.loginSuccess({
        user: {
          id: 1,
          casId: 'x',
          email: 'a@b.c',
          hasPassword: true,
          twoFactorEnabled: false,
          twoFactorConfirmedAt: null,
          recoveryCodesRemaining: 0,
        },
        member: null,
        permissions: [],
      }),
    );
    await result;

    expect(navigate).toHaveBeenCalledWith('/');
  });

  it('renvoie sur la connexion en gardant la page en cours', async () => {
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/stocks');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const result = firstValueFrom(effects.sessionExpired$);
    actionsSubject.next(AuthActions.sessionExpired());
    await result;

    expect(navigate).toHaveBeenCalledWith([AppRoutes.login], {
      queryParams: { redirectTo: '/stocks' },
    });
  });

  /**
   * ⚠️ Une session morte fait échouer toutes les requêtes en vol d'un coup : une
   * page à quatre panneaux émet quatre `sessionExpired`. Sans garde, la deuxième
   * navigation partirait avec `redirectTo=/login`, et la reconnexion réussie
   * retomberait sur la page de connexion.
   */
  it('ne rebondit pas une seconde fois depuis la page de connexion', () => {
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue(`/${AppRoutes.login}`);
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);

    effects.sessionExpired$.subscribe();
    actionsSubject.next(AuthActions.sessionExpired());

    expect(navigate).not.toHaveBeenCalled();
  });
});
