import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ColumnType, TableColumn } from './table.types';
import { TableContent } from './table-content/table-content';

export { ColumnType } from './table.types';
export type { TableColumn } from './table.types';

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
