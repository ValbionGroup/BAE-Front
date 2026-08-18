import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { PublicHeader } from './public-header/public-header';
import { PublicFooter } from './public-footer/public-footer';

@Component({
  selector: 'bfp-public-shell',
  imports: [RouterOutlet, PublicHeader, PublicFooter],
  templateUrl: './public-shell.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicShell {}
