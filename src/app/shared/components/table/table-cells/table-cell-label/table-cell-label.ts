import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bfd-table-cell-label',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="font-medium text-gray-900 dark:text-gray-100">{{ value() }}</div>
    @if (subtitle()) {
      <div class="text-xs text-gray-400 mt-0.5">{{ subtitle() }}</div>
    }
  `,
})
export class TableCellLabel {
  value = input.required<string>();
  subtitle = input<string>();
}
