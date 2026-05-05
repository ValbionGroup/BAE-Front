import {Component, input} from '@angular/core';

export enum ColumnType {
  TEXT = 'text',
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
}

@Component({
  selector: 'bfd-table',
  imports: [],
  templateUrl: './table.html',
})
export class Table<T> {
  name = input.required<string>();

  columns = input.required<TableColumn<T>[]>();
  rows = input.required<T[]>();

  protected getTextAlignment(column: TableColumn<T>) {
    switch (column.type) {
      case ColumnType.NUMBER:
      case ColumnType.QUANTITY:
        return 'text-right';
      case ColumnType.STATUS:
        return 'text-center';
      default:
        return 'text-left'
    }
  }
}
