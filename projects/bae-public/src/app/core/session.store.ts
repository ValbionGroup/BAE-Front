import { Injectable, computed, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL, ExternalNavigation } from '@bae/ui';

/**
 * L'état de liaison Telegram. `linked` est **dérivé** côté back de
 * `telegramChatId`, qui ne sort jamais : c'est l'adresse d'émission du bot.
 */
export interface TelegramLink {
  readonly handle: string | null;
  readonly linked: boolean;
  readonly linkedAt: string | null;
}

export interface SessionUser {
  readonly id: number;
  readonly email: string;
  readonly firstName: string | null;
  readonly lastName: string | null;
  /**
   * Sur l'utilisateur et non sur le client : la plupart des notifications
   * s'adressent au bureau, et un membre n'a pas forcément de ligne `clients`.
   */
  readonly telegram: TelegramLink;
}

/**
 * `unknown` n'est pas un détail : au chargement, « pas encore su » et « pas
 * connecté » se ressemblent, et les confondre déconnecte l'utilisateur à chaque
 * F5. Les gardes attendent la sortie de cet état.
 */
export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

/** Ce que le client renseigne sur lui-même, plus ce qu'EirbConnect a fourni. */
export interface ClientProfile {
  readonly phone: string | null;
  readonly promotion: string | null;
  readonly school: string | null;
  readonly registeredAt: string | null;
  readonly preparationNote: string | null;
}

export interface ProfileResponse {
  readonly user: { id: number; email: string; telegram: TelegramLink };
  /** `null` pour un client : la zone publique n'exige aucune ligne `members`. */
  readonly member: { firstName: string | null; lastName: string | null } | null;
  /** `null` pour un membre du bureau qui n'a jamais ouvert la zone publique. */
  readonly client: ClientProfile | null;
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
  private readonly navigation = inject(ExternalNavigation);

  private readonly _status = signal<SessionStatus>('unknown');
  private readonly _user = signal<SessionUser | null>(null);
  private readonly _client = signal<ClientProfile | null>(null);

  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();
  readonly client = this._client.asReadonly();
  readonly isAuthenticated = computed(() => this._status() === 'authenticated');

  /** Le nom du membre, ou la partie locale de l'e-mail pour un client. */
  readonly displayName = computed(() => {
    const user = this._user();
    if (user === null) return '';

    const full = [user.firstName, user.lastName].filter((part) => part !== null).join(' ');
    return full === '' ? user.email.split('@')[0] : full;
  });

  /** Idempotent : rappelé après un retour SSO, il ne relance rien s'il sait déjà. */
  load(): void {
    this.http.get<ProfileResponse>(`${this.baseUrl}/account/profile`).subscribe({
      next: (profile) => {
        this.setProfile(profile);
        this._status.set('authenticated');
      },
      // Un 401 est la réponse normale d'un visiteur non connecté, pas un incident.
      error: () => {
        this._user.set(null);
        this._client.set(null);
        this._status.set('anonymous');
      },
    });
  }

  /** Point d'écriture unique, réservé à `ProfileStore` après un PATCH réussi. */
  setProfile(profile: ProfileResponse): void {
    this._user.set({
      id: profile.user.id,
      email: profile.user.email,
      firstName: profile.member?.firstName ?? null,
      lastName: profile.member?.lastName ?? null,
      telegram: profile.user.telegram,
    });
    this._client.set(profile.client ?? null);
  }

  /** Délier ne rend que ce bloc : le reste du profil n'a pas bougé. */
  setTelegram(telegram: TelegramLink): void {
    this._user.update((user) => (user === null ? null : { ...user, telegram }));
  }

  /**
   * ⚠️ Une **navigation**, pas un XHR. Le serveur révoque le jeton et efface le
   * cookie `httpOnly` — que lui seul peut effacer — puis renvoie le navigateur
   * vers l'IdP pour qu'il ferme aussi sa session. Sans ce détour, recliquer
   * « EirbConnect » reconnecte sans mot de passe.
   *
   * Rien à remettre à zéro localement : on quitte l'application.
   */
  logout(): void {
    this.navigation.go(`${this.baseUrl}/auth/keycloak/logout?app=public`);
  }

  private reset(): void {
    this._user.set(null);
    this._status.set('anonymous');
  }
}
