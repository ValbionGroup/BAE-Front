import { Order } from '#core/models/order.model';
import { PreOrderTicket } from '#core/models/pre-order.model';
import type { CardPaymentStatus } from '#core/services/payments/card-payments-service';

/**
 * Les diffusions du canal `events/:id/orders`, toutes porteuses de l'objet complet.
 *
 * Les précommandes empruntent le **même** canal : la cuisine n'a qu'une file, et
 * un second canal aurait demandé un second abonnement, une seconde autorisation
 * et deux façons de se désabonner.
 */
export type WsMessage =
  | { type: 'order.created'; payload: Order }
  | { type: 'order.updated'; payload: Order }
  | { type: 'order.cancelled'; payload: Order }
  | { type: 'pre_order.updated'; payload: PreOrderTicket }
  | {
      type: 'card_payment.updated';
      payload: {
        orderRef: string;
        status: CardPaymentStatus;
        order: Order | null;
      };
    };
