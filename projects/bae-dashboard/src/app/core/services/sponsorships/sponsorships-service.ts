import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

export interface CategoryPrice {
  readonly productId: number;
  /** Centimes. Ce que la personne paie. */
  readonly priceCents: number;
}

export interface SponsorshipCategory {
  readonly id: number;
  readonly eventId: number;
  readonly label: string;
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

  create(eventId: string, label: string): Observable<SponsorshipCategory> {
    return this.http.post<SponsorshipCategory>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories`,
      { label },
    );
  }

  rename(eventId: string, categoryId: number, label: string): Observable<SponsorshipCategory> {
    return this.http.patch<SponsorshipCategory>(
      `${this.baseUrl}/events/${eventId}/sponsorship-categories/${categoryId}`,
      { label },
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
