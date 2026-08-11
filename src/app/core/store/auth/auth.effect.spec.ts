import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';
import { provideMockStore } from '@ngrx/store/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
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

  it('preserves bae_theme across logout while clearing everything else', async () => {
    localStorage.setItem(ThemeService.STORAGE_KEY, 'dark');
    localStorage.setItem('some_unrelated_key', 'should-be-wiped');

    const actionsSubject = new Subject<Action>();
    actions$ = actionsSubject.asObservable();
    effects = TestBed.inject(AuthEffects);
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'navigate').mockResolvedValue(true);

    const result = firstValueFrom(effects.logout$);
    actionsSubject.next(AuthActions.logout());
    await result;

    expect(localStorage.getItem(ThemeService.STORAGE_KEY)).toBe('dark');
    expect(localStorage.getItem('some_unrelated_key')).toBeNull();
  });
});
