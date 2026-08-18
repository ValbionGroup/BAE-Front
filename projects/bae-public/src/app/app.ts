import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DropdownContainer } from '@bae/ui';

@Component({
  selector: 'bfp-root',
  imports: [RouterOutlet, DropdownContainer],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
