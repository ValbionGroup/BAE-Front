import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

export interface ApiSeasonRef {
  readonly startYear: number;
  readonly label: string;
}

export interface ApiSeasonOption extends ApiSeasonRef {
  readonly eventCount: number;
}

export interface ApiSeasonEvent {
  readonly id: number;
  readonly name: string;
  readonly date: string;
  readonly orderCount: number;
  /** En **centimes**, comme tout montant de l'API. */
  readonly cashedCents: number;
  readonly presentCount: number;
  readonly respondentCount: number;
  readonly upcoming: boolean;
}

/** Les `*Delta*` valent `null` quand la saison n-1 n'existe pas. */
export interface ApiSeasonKpis {
  readonly cashedCents: number;
  readonly cashedDeltaPct: number | null;
  readonly avgOrdersPerEvent: number;
  readonly ordersStdDev: number;
  readonly avgBasketCents: number;
  readonly avgBasketDeltaCents: number | null;
  /** Entre 0 et 1. */
  readonly presenceRate: number;
  /** En points de pourcentage. */
  readonly presenceDeltaPts: number | null;
}

export interface ApiSeasonPrediction {
  readonly eventId: number;
  readonly eventName: string;
  readonly expectedOrders: number;
  readonly range: number;
  readonly estimatedRevenueCents: number;
  readonly preOrderCount: number;
  readonly basedOnEventCount: number;
}

export interface ApiSeasonAnalytics {
  readonly season: ApiSeasonRef;
  readonly seasons: readonly ApiSeasonOption[];
  readonly kpis: ApiSeasonKpis;
  readonly events: readonly ApiSeasonEvent[];
  readonly prediction: ApiSeasonPrediction | null;
}

@Injectable({ providedIn: 'root' })
export class AnalyseService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getSeason(startYear?: number): Observable<ApiSeasonAnalytics> {
    return this.http.get<ApiSeasonAnalytics>(`${this.baseUrl}/analytics/season`, {
      params: startYear === undefined ? {} : { season: startYear },
    });
  }
}
