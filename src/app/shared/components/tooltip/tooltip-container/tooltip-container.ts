import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FloatingDirective } from '#shared/directives/floating/floating.directive';
import { TooltipService } from '../tooltip.service';

@Component({
  selector: 'bfd-tooltip-container',
  imports: [FloatingDirective],
  templateUrl: './tooltip-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipContainer {
  protected readonly current = inject(TooltipService).current;
}
