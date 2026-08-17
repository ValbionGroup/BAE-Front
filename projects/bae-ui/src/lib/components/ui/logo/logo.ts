import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bae-logo',
  templateUrl: './logo.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  readonly size = input<number>(28);
  readonly showText = input<boolean>(true);

  /**
   * Fournie par l'application, jamais lue depuis `package.json` ici : la
   * bibliothèque est partagée par deux fronts qui se déploient sous des
   * versions distinctes, et un import remontant hors de `projects/` la lierait
   * à l'arborescence de l'un d'eux.
   */
  readonly version = input<string | null>(null);
}
