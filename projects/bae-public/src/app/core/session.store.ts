import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@bae/ui';

export interface SessionUser {
  readonly id: number;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
}

/**
 * `unknown` n'est pas un détail : au chargement, « pas encore su » et « pas
 * connecté » se ressemblent, et les confondre déconnecte l'utilisateur à chaque
 * F5. Les gardes attendent la sortie de cet état.
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

interface ProfileResponse {
  readonly user: { id: number; email: string };
  /** `null` pour un client : la zone publique n'exige aucune ligne `members`. */
  readonly member: { firstName: string | null; lastName: string | null } | null;
}

/**
 * Équivalent public du magasin d'authentification du dashboard, réduit à ce
 * dont une page ouverte au public a besoin : sait-on qui est là, et comment le
 * faire partir. Volontairement à base de signaux et **non de NgRx** — il n'y a
 * ni action à rejouer, ni effet à orchestrer.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  private readonly _status = signal<SessionStatus>('unknown');
  private readonly _user = signal<SessionUser | null>(null);

  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  /** Idempotent : rappelé après un retour SSO, il ne relance rien s'il sait déjà. */
  load(): void {
    this.http.get<ProfileResponse>(`${this.baseUrl}/account/profile`).subscribe({
      next: (profile) => {
        this._user.set({
          id: profile.user.id,
          email: profile.user.email,
          firstName: profile.member?.firstName ?? null,
          lastName: profile.member?.lastName ?? null,
        });
        this._status.set('authenticated');
      },
      // Un 401 est la réponse normale d'un visiteur non connecté, pas un incident.
      error: () => {
        this._user.set(null);
        this._status.set('anonymous');
      },
    });
  }

  /**
   * Le cookie est `httpOnly` : seul le serveur peut l'effacer. Un nettoyage
   * local laisserait la session ouverte côté API.
   */
  logout(): void {
    this.http.post<void>(`${this.baseUrl}/auth/logout`, {}).subscribe({
      next: () => this.reset(),
      error: () => this.reset(),
    });
  }

  private reset(): void {
    this._user.set(null);
    this._status.set('anonymous');
  }
}
