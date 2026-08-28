import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '@bae/ui';

// All fields are camelCase: the apiResponseCaseInterceptor converts snake_case responses automatically.

export interface ApiStockItem {
  id: number;
  name: string;
  unit: string;
  brand: string | null;
  /** `null` pour une denrée sans catégorie : la colonne est nullable. */
  categoryId: number | null;
  /** ⚠️ Le nom **nu** de la relation, comme `storageLocation` plus bas — le
   *  serveur ne sert pas de `categoryName` sur cet endpoint. */
  category: string | null;
  supplierId: number | null;
  totalRemainingQty: number;
  batchCount: number;
  nearestExpirationDate: string | null;
  expiredBatchCount: number;
  soonBatchCount: number;
  /** `null` tant que personne ne l'a signalé — la colonne est nullable. */
  storageLocationId: number | null;
  storageLocation: string | null;
}

export interface ApiStockBatch {
  id: number;
  goodsId: number;
  restockId: number | null;
  /** Le numéro lisible du lot (`L26-4`), celui qu'on lit sur l'étagère. */
  label: string;
  initialQty: number;
  remainingQty: number;
  expirationDate: string | null;
  openedAt: string | null;
}

/** Une enseigne et son tarif pour une denrée (pivot `good_suppliers`). */
export interface ApiSupplierPrice {
  readonly id: number;
  readonly name: string;
  /** ⚠️ **Centimes**, par unité de stock (`goods.unit`). */
  readonly price: number;
}

/**
 * `GET /goods/:id` — la fiche complète d'une denrée.
 *
 * ⚠️ `products` sont les **recettes** qui utilisent la denrée (pivot
 * `product_goods`). Le champ compte parce que la suppression d'une denrée
 * cascade sur ce pivot : sans le lire, l'écran laisserait amputer quatre
 * recettes en silence.
 */
export interface ApiGoodDetail {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly suppliers: readonly ApiSupplierPrice[];
  readonly bestSupplier: ApiSupplierPrice | null;
  readonly bestPrice: number | null;
  readonly products: readonly ApiNamedRef[];
}

/** Une entité de référence réduite à son identité — ici, une enseigne. */
export interface ApiNamedRef {
  readonly id: number;
  readonly name: string;
}

/** `GET /categories` — alimente le sélecteur de la modale de création. */
export interface ApiCategory {
  readonly id: number;
  readonly name: string;
}

/** Réponse de `POST /goods` : la ligne `goods` seule, sans catégorie ni agrégats. */
export interface ApiCreatedGood {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  readonly categoryId: number;
  /** Tous les codes de la denrée : un aliment se vend sous plusieurs
   *  conditionnements, donc sous plusieurs EAN. Vide si aucun. */
  readonly barcodes: readonly string[];
  readonly storageLocationId: number | null;
}

/** Contrainte `goods_unit_check` : un enum en base, pas du texte libre. */
export const GOOD_UNITS = ['pcs', 'kg', 'liter'] as const;

export type GoodUnit = (typeof GOOD_UNITS)[number];

export const GOOD_UNIT_LABELS: Readonly<Record<GoodUnit, string>> = {
  pcs: 'Pièce',
  kg: 'Kilogramme',
  liter: 'Litre',
};

/**
 * Un lieu de stockage du référentiel — « Frigo », « Cave », et tout ce que le
 * BAE y ajoute depuis la page Référentiels.
 *
 * ⚠️ Ce n'était **pas** une liste jusqu'au 2026-08-27 : `goods.storage_method`
 * portait un enum figé de quatre valeurs, doublé ici par un dictionnaire de
 * libellés. Les deux ont disparu — les options viennent maintenant du serveur,
 * et coder la liste en dur la ferait diverger dès le premier ajout.
 */
export interface ApiStorageLocation {
  readonly id: number;
  readonly name: string;
}

/** `brand` est une chaîne, jamais `null` : la colonne est `NOT NULL`. */
export interface CreateGoodPayload {
  readonly name: string;
  readonly unit: GoodUnit;
  readonly brand: string;
  readonly categoryId: number;
  /** Vide quand le produit n'a pas été créé depuis un scan. */
  readonly barcodes: readonly string[];
  /** Facultatif à la création : il se signale aussi bien plus tard, depuis le
   *  panneau de détail. */
  readonly storageLocationId: number | null;
}

/**
 * Le corps de `PATCH /goods/:id` depuis la modale d'édition.
 *
 * ⚠️ **`unit` en est absent, volontairement.** Passer une denrée de `kg` à
 * `pcs` ne convertit rien : les quantités de tous ses lots et tous ses tarifs
 * d'enseigne sont exprimés dans cette unité et deviendraient faux en silence.
 * Le contrôleur n'affecte que les clés présentes — l'omettre suffit à la
 * protéger.
 */
export interface UpdateGoodPayload {
  readonly name: string;
  readonly brand: string;
  readonly categoryId: number;
  readonly storageLocationId: number | null;
}

@Injectable({ providedIn: 'root' })
export class StocksService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = inject(API_BASE_URL);

  getAll(): Observable<ApiStockItem[]> {
    return this.http.get<ApiStockItem[]>(`${this.baseUrl}/stocks`);
  }

  getCategories(): Observable<ApiCategory[]> {
    return this.http.get<ApiCategory[]>(`${this.baseUrl}/categories`);
  }

  /**
   * Le référentiel des lieux, pour alimenter le sélecteur d'emplacement.
   *
   * ⚠️ Gardé par `storage-location:read`, que tout magasinier ne porte pas. Un
   * 403 n'est donc pas un incident : il retire le sélecteur, pas la page — d'où
   * l'appel enveloppé dans `settle()` côté magasin.
   */
  getStorageLocations(): Observable<ApiStorageLocation[]> {
    return this.http.get<ApiStorageLocation[]>(`${this.baseUrl}/storage-locations`);
  }

  createGood(payload: CreateGoodPayload): Observable<ApiCreatedGood> {
    return this.http.post<ApiCreatedGood>(`${this.baseUrl}/goods`, payload);
  }

  /** Réécrit l'identité d'une denrée : nom, marque, catégorie, emplacement. */
  updateGood(id: number, payload: UpdateGoodPayload): Observable<ApiCreatedGood> {
    return this.http.patch<ApiCreatedGood>(`${this.baseUrl}/goods/${id}`, payload);
  }

  /** Liste vide si le code n'est rattaché à rien : réponse normale, pas une
   *  erreur — c'est elle qui déclenche le rattachement ou la création. */
  findByBarcode(barcode: string): Observable<ApiCreatedGood[]> {
    return this.http.get<ApiCreatedGood[]>(`${this.baseUrl}/goods`, { params: { barcode } });
  }

  /** Rattache un code lu à une denrée déjà au catalogue. Refus `E_BARCODE_TAKEN`
   *  si une autre denrée l'a pris entre le scan et la validation. */
  attachBarcode(goodId: number, code: string): Observable<{ goodId: number; code: string }> {
    return this.http.post<{ goodId: number; code: string }>(
      `${this.baseUrl}/goods/${goodId}/barcodes`,
      { code },
    );
  }

  /** Entre un lot en stock. `expirationDate` est un `YYYY-MM-DD`, ou `null`. */
  createBatch(payload: {
    goodId: number;
    quantity: number;
    expirationDate: string | null;
  }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/stock-batches`, payload);
  }

  /**
   * La fiche d'une denrée : ses tarifs et les recettes qui l'utilisent.
   *
   * Les tarifs arrivent **triés du moins cher au plus cher** par l'API. Le
   * premier est le prix de référence : c'est lui que `bestSupplierPrice` sert au
   * coût de recette, à la liste de courses et au bilan de soirée.
   *
   * ⚠️ Les prix sont en **centimes**, comme tout montant de l'API.
   */
  getGood(goodId: number): Observable<ApiGoodDetail> {
    return this.http.get<ApiGoodDetail>(`${this.baseUrl}/goods/${goodId}`);
  }

  /**
   * ⚠️ Supprime **en cascade** : les lots, leur historique de mouvements, les
   * tarifs, les codes-barres, et la ligne de la denrée dans chaque recette qui
   * l'utilise. L'API ne le refuse jamais — l'avertissement est à l'écran.
   */
  deleteGood(goodId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/goods/${goodId}`);
  }

  /** Pose ou corrige — la même route fait les deux, c'est le même geste. */
  setSupplierPrice(goodId: number, supplierId: number, priceCents: number): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/goods/${goodId}/suppliers/${supplierId}`, {
      priceCents,
    });
  }

  removeSupplierPrice(goodId: number, supplierId: number): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/goods/${goodId}/suppliers/${supplierId}`);
  }

  getSuppliers(): Observable<ApiNamedRef[]> {
    return this.http.get<ApiNamedRef[]>(`${this.baseUrl}/suppliers`);
  }

  getBatches(goodsId: number, showEmpty = false): Observable<ApiStockBatch[]> {
    const params = showEmpty ? { showEmpty: 'true' } : undefined;
    return this.http.get<ApiStockBatch[]>(`${this.baseUrl}/stocks/${goodsId}/batches`, { params });
  }

  /**
   * Sort une quantité d'un lot précis — le geste de la sortie partielle.
   *
   * ⚠️ `movementType` n'est pas un paramètre : une **entrée** en stock passe par
   * un lot (`createBatch`), qui porte sa DLC et son étiquette. Un mouvement `in`
   * ajouterait de la quantité à un lot sans dire d'où elle vient.
   *
   * L'API refuse en 422 `E_STOCK_INSUFFICIENT` une quantité supérieure au
   * restant, et `E_BATCH_MISMATCH` un lot d'une autre denrée.
   */
  removeFromBatch(payload: {
    goodId: number;
    stockBatchId: number;
    quantity: number;
  }): Observable<unknown> {
    return this.http.post(`${this.baseUrl}/stock-movements`, {
      ...payload,
      movementType: 'out',
    });
  }

  discardBatch(goodsId: number, batchId: number, remainingQty: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/stocks/${goodsId}/batches/${batchId}/discard`, {
      remainingQty,
    });
  }
}
