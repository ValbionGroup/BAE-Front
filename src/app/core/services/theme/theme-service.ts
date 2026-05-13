import { Injectable, computed, effect, signal } from '@angular/core';

export type ThemeMode = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const STORAGE_KEY = 'bae-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly _mode = signal<ThemeMode>(this.readInitialMode());
  private readonly _systemPref = signal<ResolvedTheme>(this.readSystemPref());

  readonly mode = this._mode.asReadonly();
  readonly resolved = computed<ResolvedTheme>(() =>
    this._mode() === 'system' ? this._systemPref() : (this._mode() as ResolvedTheme),
  );

  constructor() {
    // React to system preference changes when in 'system' mode.
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-color-scheme: dark)');
      const handler = (e: MediaQueryListEvent): void => {
        this._systemPref.set(e.matches ? 'dark' : 'light');
      };
      mq.addEventListener('change', handler);
    }

    effect(() => {
      const resolved = this.resolved();
      document.documentElement.classList.toggle('light', resolved === 'light');
      try {
        localStorage.setItem(STORAGE_KEY, this._mode());
      } catch {
        /* storage unavailable — non-fatal */
      }
    });
  }

  toggle(): void {
    // Toggle cycles between the two explicit themes; switching away from 'system'.
    this._mode.update((m) => (this.resolved() === 'dark' ? 'light' : 'dark'));
  }

  set(mode: ThemeMode): void {
    this._mode.set(mode);
  }

  private readInitialMode(): ThemeMode {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
    } catch {
      /* storage unavailable */
    }
    return 'system';
  }

  private readSystemPref(): ResolvedTheme {
    if (typeof window === 'undefined' || !window.matchMedia) return 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
