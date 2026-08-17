import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { LucideAlertTriangle, LucideCheckCircle, LucideXCircle } from '@lucide/angular';

@Component({
  selector: 'bfd-table-cell-pill',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [LucideCheckCircle, LucideAlertTriangle, LucideXCircle],
  template: `
    @if (variant() === 'status') {
      @switch (value()) {
        @case ('ok') {
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
          >
            <svg lucideCheckCircle [size]="11" aria-hidden="true"></svg>
            OK
          </span>
        }
        @case ('low') {
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
          >
            <svg lucideAlertTriangle [size]="11" aria-hidden="true"></svg>
            Faible
          </span>
        }
        @case ('out') {
          <span
            class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
          >
            <svg lucideXCircle [size]="11" aria-hidden="true"></svg>
            Rupture
          </span>
        }
      }
    } @else {
      <span
        class="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300"
      >
        {{ value() }}
      </span>
    }
  `,
})
export class TableCellPill {
  value = input.required<string>();
  variant = input<'pill' | 'status'>('pill');
}
