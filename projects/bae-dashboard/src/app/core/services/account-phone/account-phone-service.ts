import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';
import { ApiEndPointV1 } from '#core/models/endpoint.model';

/** Le numéro tel que le serveur l'a normalisé — jamais celui qui a été tapé. */
export interface AccountPhone {
  readonly phone: string | null;
}

@Injectable({ providedIn: 'root' })
export class AccountPhoneService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** `null` efface le numéro. */
  update$(phone: string | null): Observable<AccountPhone> {
    return this.http.put<AccountPhone>(`${this.baseUrl}${ApiEndPointV1.ACCOUNT_PHONE}`, { phone });
  }
}
