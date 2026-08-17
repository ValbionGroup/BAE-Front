import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FloatingDirective } from '../../../directives/floating/floating.directive';
import { TooltipService } from '../tooltip.service';

@Component({
  selector: 'bae-tooltip-container',
  imports: [FloatingDirective],
  templateUrl: './tooltip-container.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TooltipContainer {
  protected readonly current = inject(TooltipService).current;
}
