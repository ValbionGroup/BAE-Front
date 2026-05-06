import {ChangeDetectionStrategy, Component, input} from '@angular/core';

@Component({
  selector: 'bfd-table-cell-text',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<span class="text-gray-500 dark:text-gray-400">{{ value() }}</span>`,
})
export class TableCellText {
  value = input.required<string>();
}
