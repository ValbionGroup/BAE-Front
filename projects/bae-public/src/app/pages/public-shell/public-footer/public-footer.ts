import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Logo } from '@bae/ui';

@Component({
  selector: 'bfp-public-footer',
  imports: [RouterLink, Logo],
  templateUrl: './public-footer.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PublicFooter {
  protected readonly year = new Date().getFullYear();
}
