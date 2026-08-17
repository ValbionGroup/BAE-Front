import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'bae-card',
  templateUrl: './card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Card {
  readonly padding = input<number>(18);
  /**
   * La carte se laisse remplir par son contenu et lui délègue le défilement.
   *
   * Sans cela, les classes de flex posées sur `<bae-card>` s'arrêtent à l'hôte :
   * le `<div>` interne reste un bloc de hauteur automatique, et un enfant
   * projeté en `flex-1 overflow-y-auto` ne défile jamais.
   */
  readonly fill = input<boolean>(false);
}
