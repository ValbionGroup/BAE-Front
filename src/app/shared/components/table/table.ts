import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TableContent } from './table-content/table-content';

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

@Component({
  selector: 'bfd-table',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableContent],
  templateUrl: './table.html',
})
export class Table<T extends object> {
  name = input.required<string>();
  columns = input.required<TableColumn<T>[]>();
  rows = input.required<T[]>();
  emptyMessage = input<string>('Aucun résultat');

  protected getThClasses(column: TableColumn<T>): string {
    const parts = [
      'px-4 py-3 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide',
    ];
    if (column.type === ColumnType.NUMBER || column.type === ColumnType.QUANTITY) {
      parts.push('text-right');
    } else if (column.type === ColumnType.STATUS) {
      parts.push('text-center');
    } else {
      parts.push('text-left');
    }
    if (column.responsive === 'md') parts.push('hidden md:table-cell');
    else if (column.responsive === 'sm') parts.push('hidden sm:table-cell');
    if (column.hidden) parts.push('hidden');
    return parts.join(' ');
  }
}
