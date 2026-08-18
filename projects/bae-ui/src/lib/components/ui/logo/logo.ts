import { NgOptimizedImage } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bae-logo',
  templateUrl: './logo.html',
  imports: [NgOptimizedImage],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Logo {
  /**
   * Hauteur rendue de la marque, en pixels ; la largeur suit le ratio de
   * l'image. Elle est appliquée en CSS et non via les attributs `width` /
   * `height` : `NgOptimizedImage` fige ces derniers après l'initialisation.
   */
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
