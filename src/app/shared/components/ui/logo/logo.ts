import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bfd-logo',
  templateUrl: './logo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly size = input<number>(28);
  readonly showText = input<boolean>(true);
}
