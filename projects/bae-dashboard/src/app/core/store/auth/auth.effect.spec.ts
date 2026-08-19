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
});
