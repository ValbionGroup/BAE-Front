import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { LucideCheck, LucideDynamicIcon, LucideTriangleAlert } from '@lucide/angular';
import { Btn } from '#shared/components/ui/btn/btn';
import { formatCents } from '#shared/utils/money';
import type { Order } from '#core/models/order.model';
import type { Buyer, PreOrderPickup } from '#core/services/buyers/buyers-service';

export type Pickup = { buyer: Buyer; preOrder: PreOrderPickup };

/**
 * Retour du comptoir, en deux formes selon la place disponible.
 *
 * Sur écran large, un bandeau au-dessus du ticket. Sur mobile, la vue entière
 * passe au vert — le geste au comptoir est bref et se lit d'un coup d'œil, comme
 * la validation d'un billet à l'entrée.
 *
 * Le **numéro de commande** est l'information principale : c'est ce que le
 * caissier annonce au client, seul repère quand la commande est anonyme.
 */
@Component({
  selector: 'bfd-checkout-feedback',
  imports: [Btn, LucideDynamicIcon],
  templateUrl: './checkout-feedback.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutFeedback {
  readonly order = input<Order | null>(null);
  readonly error = input<string | null>(null);
  /** Retrait de précommande lu au scanner : rien à encaisser, on laisse passer. */
  readonly pickup = input<Pickup | null>(null);
  readonly dismissed = output<void>();

  private readonly destroyRef = inject(DestroyRef);
  private timer?: ReturnType<typeof setTimeout>;

  protected readonly icCheck = LucideCheck;
  protected readonly icError = LucideTriangleAlert;
  protected readonly formatCents = formatCents;

  constructor() {
    // Un succès s'efface seul pour ne pas bloquer la commande suivante ; un
    // refus reste tant qu'il n'est pas lu.
    effect(() => {
      const order = this.order();
      const pickup = this.pickup();
      clearTimeout(this.timer);
      // Un retrait reste plus longtemps : le caissier lit une liste d'articles,
      // là où une confirmation d'encaissement tient dans un numéro.
      if (order) this.timer = setTimeout(() => this.dismissed.emit(), 6000);
      else if (pickup) this.timer = setTimeout(() => this.dismissed.emit(), 12000);
    });

    this.destroyRef.onDestroy(() => clearTimeout(this.timer));
  }

  protected close(): void {
    clearTimeout(this.timer);
    this.dismissed.emit();
  }
}
