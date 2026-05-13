import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bfd-card',
  templateUrl: './card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  readonly padding = input<number>(18);
}
