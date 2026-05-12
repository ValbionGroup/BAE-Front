import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MenuItem } from '#core/models/event.model';

@Component({
  selector: 'bfd-menu-overview',
  templateUrl: './menu-overview.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuOverview {
  items = input.required<MenuItem[]>();
}
