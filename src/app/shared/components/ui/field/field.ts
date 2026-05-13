import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bfd-field',
  templateUrl: './field.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Field {
  readonly label = input<string | null>(null);
  readonly hint = input<string | null>(null);
}
