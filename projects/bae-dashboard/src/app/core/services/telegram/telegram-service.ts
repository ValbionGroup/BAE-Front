import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '@bae/ui';
import { Observable } from 'rxjs';
import { ApiEndPointV1 } from '#core/models/endpoint.model';
import { TelegramLinkModel } from '#core/models/user.model';

/**
 * Le billet d'entrée dans Telegram. `url` est construite par le serveur : le nom
 * du bot reste ainsi hors des fichiers d'environnement du front.
 */
export interface TelegramLinkTicket {
  readonly url: string;
  readonly code: string;
  readonly botUsername: string;
  readonly expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class TelegramService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  startLink$(): Observable<TelegramLinkTicket> {
    return this.http.post<TelegramLinkTicket>(
      `${this.baseUrl}${ApiEndPointV1.ACCOUNT_TELEGRAM_LINK}`,
      {},
    );
  }

  /** Rend l'état de liaison plutôt qu'un `204` : le magasin le remplace tel quel. */
  unlink$(): Observable<TelegramLinkModel> {
    return this.http.delete<TelegramLinkModel>(
      `${this.baseUrl}${ApiEndPointV1.ACCOUNT_TELEGRAM_LINK}`,
    );
  }
}
