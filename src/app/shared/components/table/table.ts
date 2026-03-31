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

export interface TableColumn {
  id: string;
  label: string;
  type: ColumnType;
  responsive?: 'sm' | 'md';
  hidden?: boolean;
}

@Component({
  selector: 'bfd-table',
  imports: [],
  templateUrl: './table.html',
})
export class Table {
  name = input.required<string>();
  columns = input.required<TableColumn[]>();

  protected getTextAlignment(column: TableColumn) {
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
