import {ChangeDetectionStrategy, Component, input} from '@angular/core';
import {ColumnType, TableColumn} from '../table';
import {TableCellLabel} from '../table-cells/table-cell-label/table-cell-label';
import {TableCellNumber} from '../table-cells/table-cell-number/table-cell-number';
import {TableCellPill} from '../table-cells/table-cell-pill/table-cell-pill';
import {TableCellQuantity} from '../table-cells/table-cell-quantity/table-cell-quantity';
import {TableCellText} from '../table-cells/table-cell-text/table-cell-text';

@Component({
  selector: 'tbody[bfd-table-content]',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TableCellText, TableCellLabel, TableCellNumber, TableCellQuantity, TableCellPill],
  templateUrl: './table-content.html',
})
export class TableContent<T extends object> {
  columns = input.required<TableColumn<T>[]>();
  rows = input.required<T[]>();
  emptyMessage = input<string>('Aucun résultat');

  protected readonly ColumnType = ColumnType;

  protected getCellValue(row: T, column: TableColumn<T>): unknown {
    const raw = row[column.key];
    return column.renderHook ? column.renderHook(raw, row) : raw;
  }

  protected getUnit(row: T, column: TableColumn<T>): string | undefined {
    if (!column.unitKey) return undefined;
    const val = row[column.unitKey];
    return val != null ? String(val) : undefined;
  }

  protected getSubtitle(row: T, column: TableColumn<T>): string | undefined {
    if (!column.subtitleKey) return undefined;
    const val = row[column.subtitleKey];
    return val != null ? String(val) : undefined;
  }

  protected getTdClasses(column: TableColumn<T>): string {
    const parts = ['px-4 py-3'];
    if (column.type === ColumnType.NUMBER || column.type === ColumnType.QUANTITY) {
      parts.push('text-right');
    } else if (column.type === ColumnType.STATUS) {
      parts.push('text-center');
    }
    if (column.responsive === 'md') parts.push('hidden md:table-cell');
    else if (column.responsive === 'sm') parts.push('hidden sm:table-cell');
    return parts.join(' ');
  }
}
