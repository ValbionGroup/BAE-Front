import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'bae-kbd',
  templateUrl: './kbd.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Kbd {}
