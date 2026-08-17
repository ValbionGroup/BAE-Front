import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bae-table-cell-quantity',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="font-mono text-gray-900 dark:text-gray-100">{{ value() }}</span>
    @if (unit()) {
      <span class="text-gray-400 text-xs font-sans">&nbsp;{{ unit() }}</span>
    }
  `,
})
export class TableCellQuantity {
  value = input.required<number | string>();
  unit = input<string>();
}
