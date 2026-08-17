import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bfd-table-cell-number',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="font-mono text-gray-400 dark:text-gray-500">{{ value() }}</span>`,
})
export class TableCellNumber {
  value = input.required<string | number>();
}
