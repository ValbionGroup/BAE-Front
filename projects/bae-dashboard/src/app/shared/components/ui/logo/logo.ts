import { ChangeDetectionStrategy, Component, input } from '@angular/core';

import packageInfo from '../../../../../../../../package.json';

@Component({
  selector: 'bfd-logo',
  templateUrl: './logo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  protected readonly version = packageInfo.version;

  readonly size = input<number>(28);
  readonly showText = input<boolean>(true);
}
