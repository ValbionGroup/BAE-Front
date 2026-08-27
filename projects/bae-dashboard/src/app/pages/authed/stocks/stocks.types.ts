export type DlcStatus = 'expired' | 'soon' | 'ok' | 'none';

/**
 * Où se conserve une denrée — « Signaler la méthode de stockage », P1 du CDC.
 * `null` n'est pas une valeur manquante par accident : la colonne est nullable
 * exprès, et se lit « pas encore signalé ».
 */
export type StorageMethod = 'fridge' | 'freezer' | 'dry' | 'cellar';
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
  readonly categoryId: number;
  readonly categoryName: string;
  readonly totalQty: number;
  readonly batchCount: number;
  readonly nearestDlc: string | null;
  readonly nearestDlcStatus: DlcStatus;
  readonly expiredBatchCount: number;
  readonly soonBatchCount: number;
  readonly storageMethod: StorageMethod | null;
}

export interface StockCategory {
  readonly id: number;
  readonly name: string;
}
