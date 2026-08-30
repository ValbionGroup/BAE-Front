import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { API_BASE_URL, messageOf } from '@bae/ui';

import { SessionStore, type ClientProfile } from './session.store';

/** Une clé absente veut dire « ne touche pas » ; `null` veut dire « efface ». */
export interface TelegramLinkTicket {
  readonly url: string;
  readonly code: string;
  readonly botUsername: string;
  readonly expiresAt: string;
}

export type ProfileWritePayload = {
  phone?: string | null;
  telegramHandle?: string | null;
  preparationNote?: string | null;
};

/**
 * Le chemin d'**écriture** du profil, séparé de `SessionStore` qui n'en fait
 * aucune : un enregistrement raté ne doit pas pouvoir faire bouger l'état dont
 * dépendent les gardes de route.
 */
@Injectable({ providedIn: 'root' })
export class ProfileStore {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);
  private readonly session = inject(SessionStore);

  private readonly _saving = signal(false);
  private readonly _saveError = signal<string | null>(null);

  readonly saving = this._saving.asReadonly();
  readonly saveError = this._saveError.asReadonly();

  async save(patch: ProfileWritePayload): Promise<boolean> {
    this._saving.set(true);
    this._saveError.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.patch<ClientProfile>(`${this.baseUrl}/account/profile`, patch),
      );
      this.session.setClient(updated);
      return true;
    } catch (error: unknown) {
      this._saveError.set(messageOf(error, 'Vos informations n’ont pas pu être enregistrées.'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  /**
   * Le serveur construit l'URL : le nom du bot reste ainsi hors des fichiers
   * d'environnement du front. Rend `null` quand il refuse — un compte déjà lié
   * doit être délié d'abord.
   */
  async startTelegramLink(): Promise<string | null> {
    this._saving.set(true);
    this._saveError.set(null);

    try {
      const ticket = await firstValueFrom(
        this.http.post<TelegramLinkTicket>(`${this.baseUrl}/account/telegram/link`, {}),
      );
      return ticket.url;
    } catch (error: unknown) {
      this._saveError.set(messageOf(error, 'Le lien Telegram n’a pas pu être créé.'));
      return null;
    } finally {
      this._saving.set(false);
    }
  }

  async unlinkTelegram(): Promise<boolean> {
    this._saving.set(true);
    this._saveError.set(null);

    try {
      const updated = await firstValueFrom(
        this.http.delete<ClientProfile>(`${this.baseUrl}/account/telegram/link`),
      );
      this.session.setClient(updated);
      return true;
    } catch (error: unknown) {
      this._saveError.set(messageOf(error, 'La déliaison n’a pas pu aboutir.'));
      return false;
    } finally {
      this._saving.set(false);
    }
  }

  clearError(): void {
    this._saveError.set(null);
  }
}
