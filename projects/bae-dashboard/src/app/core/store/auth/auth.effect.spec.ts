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
import { ThemeService } from '#core/services/theme/theme-service';
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
   * ⚠️ Le contrat a changé avec la bascule sur le cookie `httpOnly` : seul le
   * serveur peut effacer un cookie, donc la déconnexion **est une requête**.
   *
   * Le `localStorage.clear()` a disparu avec le jeton qu'il servait à effacer —
   * et avec lui le contournement qui préservait la préférence de thème. Ce test
   * garde désormais le fait que la déconnexion **ne touche plus au stockage
   * local du tout** : y remettre un `clear()` réinitialiserait le thème à chaque
   * déconnexion, ce qui était précisément le bug corrigé au §0 decies.
   */
  it('appelle le serveur et ne touche pas au stockage local', async () => {
    localStorage.setItem(ThemeService.STORAGE_KEY, 'dark');
    localStorage.setItem('une_autre_cle', 'doit-survivre');

    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const httpMock = TestBed.inject(HttpTestingController);

    const result = firstValueFrom(effects.logout$);
    actionsSubject.next(AuthActions.logout());

    httpMock.expectOne((request) => request.url.endsWith('/auth/logout')).flush(null);
    await result;

    expect(localStorage.getItem(ThemeService.STORAGE_KEY)).toBe('dark');
    expect(localStorage.getItem('une_autre_cle')).toBe('doit-survivre');
    expect(router.navigate).toHaveBeenCalled();
    httpMock.verify();
  });

  /**
   * Insister sur un appel qui échoue garderait l'utilisateur sur une page qu'il a
   * demandé à quitter. Le cookie expirera de lui-même.
   */
  it('redirige même si l’appel de déconnexion échoue', async () => {
    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const httpMock = TestBed.inject(HttpTestingController);

    const result = firstValueFrom(effects.logout$);
    actionsSubject.next(AuthActions.logout());

    httpMock
      .expectOne((request) => request.url.endsWith('/auth/logout'))
      .flush(null, { status: 500, statusText: 'Server Error' });
    await result;

    expect(router.navigate).toHaveBeenCalled();
    httpMock.verify();
  });
});
