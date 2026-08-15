import { Order } from '#core/models/order.model';

/** Les trois diffusions du canal `events/:id/orders`, toutes porteuses de la commande complète. */
export type WsMessage =
  | { type: 'order.created'; payload: Order }
  | { type: 'order.updated'; payload: Order }
  | { type: 'order.cancelled'; payload: Order };
