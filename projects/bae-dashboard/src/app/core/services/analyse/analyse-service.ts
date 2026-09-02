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

/** `seasonal` : calée sur la soirée équivalente de n-1. `average` : à défaut. */
export type PredictionMethod = 'seasonal' | 'average';

export interface ApiProductionLine {
  readonly productId: number;
  readonly productName: string;
  readonly categoryName: string;
  /** Quantité déjà saisie au menu de la soirée. */
  readonly plannedQty: number;
  /** `null` quand le produit n'a aucun passé sur quoi s'appuyer. */
  readonly expectedQty: number | null;
  readonly reservedQty: number;
  readonly flooredByPreOrders: boolean;
}

export interface ApiProductionCategory {
  readonly categoryName: string;
  readonly plannedQty: number;
  readonly expectedQty: number;
  readonly lines: readonly ApiProductionLine[];
}

export interface ApiProductionForecast {
  readonly categories: readonly ApiProductionCategory[];
  readonly totalPlannedQty: number;
  /** Tous produits confondus — ce que la soirée devrait écouler. */
  readonly totalExpectedQty: number;
  /** Lignes sans estimation ; le total les compte pour zéro. */
  readonly linesWithoutBasis: number;
}

export interface ApiSeasonPrediction {
  readonly eventId: number;
  readonly eventName: string;
  readonly expectedOrders: number;
  readonly range: number;
  readonly estimatedRevenueCents: number;
  readonly preOrderCount: number;
  readonly basedOnEventCount: number;
  readonly method: PredictionMethod;
  /** Renseignés en méthode `seasonal` seulement. */
  readonly modelEventName: string | null;
  readonly modelEventDate: string | null;
  readonly modelOrderCount: number | null;
  /** Recadrage appliqué, en pourcentage : `15` vaut ×1,15, `0` est neutre. */
  readonly trendPct: number | null;
  /** Vrai quand les précommandes ont relevé l'estimation. */
  readonly flooredByPreOrders: boolean;
  /** La même prédiction, article par article — ce qu'il faut produire. */
  readonly production: ApiProductionForecast;
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
