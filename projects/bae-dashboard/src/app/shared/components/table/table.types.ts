export enum ColumnType {
  TEXT = 'text',
  LABEL = 'label',
  NUMBER = 'number',
  DATE = 'date',
  QUANTITY = 'quantity',
  STATUS = 'status',
  PILL = 'pill',
  PILLS = 'pills',
}

export interface TableColumn<T> {
  key: keyof T;
  label: string;
  type: ColumnType;
  renderHook?: (value: unknown, row?: T) => unknown;
  tooltip?: string;
  responsive?: 'sm' | 'md';
  hidden?: boolean;
  unitKey?: keyof T;
  subtitleKey?: keyof T;
}
