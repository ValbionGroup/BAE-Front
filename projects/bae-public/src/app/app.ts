import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { DropdownContainer, ToastContainer } from '@bae/ui';

@Component({
  selector: 'bfp-root',
  imports: [RouterOutlet, DropdownContainer, ToastContainer],
  templateUrl: './app.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
