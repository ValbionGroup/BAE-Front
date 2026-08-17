import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '#core/tokens/api-url.token';

// Toutes les clés sont en camelCase : les intercepteurs de casse convertissent
// dans les deux sens.

/** Un lot à prélever, tel qu'on le lit devant l'étagère. */
export interface ProductionPick {
  readonly batchId: number;
  /** Le numéro lisible du lot (`L26-4`) — jamais la clé technique. */
  readonly label: string;
  readonly expirationDate: string | null;
  readonly takeQty: number;
}

export interface ProductionNeed {
  readonly goodId: number;
  readonly goodName: string;
  readonly unit: string;
  readonly needQty: number;
  readonly availableQty: number;
  readonly picks: readonly ProductionPick[];
}

export interface ProductionShortfall {
  readonly goodId: number;
  readonly goodName: string;
  readonly needQty: number;
  readonly availableQty: number;
  readonly missingQty: number;
}

/**
 * Réponse de la **simulation**. `shortfalls` non vide veut dire que le
 * lancement réel serait refusé (409) — l'écran doit le dire avant le clic, pas
 * après.
 */
export interface ProductionPlan {
  readonly productId: number;
  readonly quantity: number;
  readonly lines: readonly ProductionNeed[];
  readonly shortfalls: readonly ProductionShortfall[];
}

/** Réponse du lancement réel. Pas de `shortfalls` : s'il y en avait, c'est un 409. */
export interface ProductionRunResult {
  readonly id: number;
  readonly productId: number;
  readonly quantity: number;
  readonly lines: readonly ProductionNeed[];
}

export interface ProductionRunSummary {
  readonly id: number;
  readonly quantity: number;
  readonly createdAt: string | null;
}

export interface ProductionLine {
  readonly productId: number;
  readonly productName: string;
  /** La quantité au menu (`event_products.quantity`). `0` si la recette a été
   *  produite puis retirée du menu — un lancement est un fait. */
  readonly plannedQty: number;
  readonly producedQty: number;
  readonly runs: readonly ProductionRunSummary[];
}

export interface ReturnableGood {
  readonly goodId: number;
  readonly goodName: string;
  readonly unit: string;
  readonly takenQty: number;
  readonly returnedQty: number;
  readonly returnableQty: number;
}

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  /** Ce qui a été produit face à ce qui était prévu, par recette. */
  getRuns(eventId: string | number): Observable<ProductionLine[]> {
    return this.http.get<ProductionLine[]>(`${this.baseUrl}/events/${eventId}/production-runs`);
  }

  /**
   * La simulation : le plan FEFO **sans rien écrire**. C'est elle qui répond à
   * « le système indique de prendre le lot n°4, 5, 8 ».
   */
  planRun(
    eventId: string | number,
    productId: number,
    quantity: number,
  ): Observable<ProductionPlan> {
    return this.http.post<ProductionPlan>(`${this.baseUrl}/events/${eventId}/production-runs`, {
      productId,
      quantity,
      dryRun: true,
    });
  }

  /**
   * Le lancement réel. ⚠️ Le back **recalcule** le plan dans sa transaction et
   * ne rejoue jamais celui qui a été simulé : quelqu'un a pu prendre le même lot
   * entre-temps. Ce qui revient ici est ce qui a réellement été prélevé.
   */
  commitRun(
    eventId: string | number,
    productId: number,
    quantity: number,
  ): Observable<ProductionRunResult> {
    return this.http.post<ProductionRunResult>(
      `${this.baseUrl}/events/${eventId}/production-runs`,
      { productId, quantity },
    );
  }

  /** Ce que la soirée a prélevé, par denrée — alimente la modale de clôture. */
  getReturnable(eventId: string | number): Observable<ReturnableGood[]> {
    return this.http.get<ReturnableGood[]>(`${this.baseUrl}/events/${eventId}/production-returns`);
  }

  /**
   * Ne transmet **que** les lignes à remettre en réserve. Mettre au rebut
   * n'écrit rien : la sortie de stock a eu lieu au lancement, jeter c'est ne pas
   * recréditer.
   */
  commitReturns(
    eventId: string | number,
    lines: readonly { goodId: number; quantity: number }[],
  ): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/events/${eventId}/production-returns`, { lines });
  }
}
