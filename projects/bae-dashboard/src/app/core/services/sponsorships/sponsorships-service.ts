import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

export interface CategoryPrice {
  readonly productId: number;
  /** Centimes. Ce que la personne paie. */
  readonly priceCents: number;
}

/**
 * `external` : un tiers rembourse l'écart, réclamé sur le justificatif.
 * `internal` : le BAE l'offre — l'écart part en manque à gagner et n'est
 * jamais recouvré.
 */
export type SponsorshipMode = 'external' | 'internal';

export const SPONSORSHIP_MODE_LABELS: Readonly<Record<SponsorshipMode, string>> = {
  external: 'Refacturée à un tiers',
  internal: 'Offerte par le BAE',
};

export interface SponsorshipCategory {
  readonly id: number;
  readonly eventId: number;
  readonly label: string;
  readonly mode: SponsorshipMode;
  readonly prices: readonly CategoryPrice[];
}

/** `null` retire la ligne : l'article repasse au prix public. */
export interface PriceEntry {
  readonly productId: number;
  readonly priceCents: number | null;
}

@Injectable({ providedIn: 'root' })
export class SponsorshipsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  list(eventId: string): Observable<SponsorshipCategory[]> {
    return this.http.get<SponsorshipCategory[]>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories`,
    );
  }

  create(eventId: string, label: string, mode: SponsorshipMode): Observable<SponsorshipCategory> {
    return this.http.post<SponsorshipCategory>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories`,
      { label, mode },
    );
  }

  /** Renommer reste libre ; basculer le mode est refusé dès la première vente
   *  (`409 E_CATEGORY_IN_USE`). */
  update(
    eventId: string,
    categoryId: number,
    changes: { label?: string; mode?: SponsorshipMode },
  ): Observable<SponsorshipCategory> {
    return this.http.patch<SponsorshipCategory>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories/${categoryId}`,
      changes,
    );
  }

  setPrices(
    eventId: string,
    categoryId: number,
    prices: readonly PriceEntry[],
  ): Observable<SponsorshipCategory> {
    return this.http.put<SponsorshipCategory>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories/${categoryId}/prices`,
      { prices },
    );
  }

  qr(eventId: string, categoryId: number): Observable<{ token: string }> {
    return this.http.get<{ token: string }>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories/${categoryId}/qr`,
    );
  }

  rotateQr(eventId: string, categoryId: number): Observable<SponsorshipCategory> {
    return this.http.post<SponsorshipCategory>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories/${categoryId}/qr/rotate`,
      {},
    );
  }

  remove(eventId: string, categoryId: number): Observable<void> {
    return this.http.delete<void>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories/${categoryId}`,
    );
  }
}
