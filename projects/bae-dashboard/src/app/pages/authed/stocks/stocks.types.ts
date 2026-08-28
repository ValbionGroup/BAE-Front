export type DlcStatus = 'expired' | 'soon' | 'ok' | 'none';

export type SortKey = 'name' | 'qty' | 'dlc' | 'category';
export type SortDir = 'asc' | 'desc';

export interface StockBatchRow {
  readonly id: number;
  readonly restockId: number | null;
  /** Le numéro lisible du lot (`L26-4`) — `id` est une clé technique. */
  readonly label: string;
  readonly initialQty: number;
  readonly remainingQty: number;
  readonly dlcLabel: string | null;
  readonly dlcStatus: DlcStatus;
  readonly openedAt: string | null;
}

export interface StockProduct {
  readonly id: number;
  readonly name: string;
  readonly unit: string;
  readonly brand: string | null;
  readonly categoryId: number | null;
  readonly categoryName: string;
  readonly totalQty: number;
  readonly batchCount: number;
  readonly nearestDlc: string | null;
  readonly nearestDlcStatus: DlcStatus;
  readonly expiredBatchCount: number;
  readonly soonBatchCount: number;
  /**
   * Où se conserve la denrée. `null` n'est pas une valeur manquante par
   * accident : la colonne est nullable exprès et se lit « pas encore signalé ».
   *
   * ⚠️ **Le nom en plus de l'id.** Le référentiel des lieux est gardé par
   * `storage-location:read` ; un magasinier qui ne le porte pas ne peut pas
   * résoudre l'id, et perdrait la lecture de l'emplacement en même temps que le
   * droit de le changer. Le serveur rend donc les deux.
   */
  readonly storageLocationId: number | null;
  readonly storageLocationName: string | null;
}

export interface StockCategory {
  readonly id: number;
  readonly name: string;
}
