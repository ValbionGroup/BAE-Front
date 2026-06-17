import { Order } from '#core/models/order.model';

export type WsMessage =
  | { type: 'order.created'; payload: Order }
  | { type: 'order.updated'; payload: Order }
  | { type: 'order.cancelled'; payload: { id: string } };
