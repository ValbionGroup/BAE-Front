export type DlcStatus = 'expired' | 'soon' | 'ok' | 'none';
export type SortKey = 'name' | 'qty' | 'dlc' | 'category';
export type SortDir = 'asc' | 'desc';

export interface StockBatchRow {
  readonly id: number;
  readonly restockId: number | null;
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
}

export interface StockCategory {
  readonly id: number;
  readonly name: string;
}
