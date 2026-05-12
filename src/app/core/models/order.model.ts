export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled';

export interface OrderItem {
  recipeId: string;
  recipeName: string;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  number: number;
  eventId: string;
  items: OrderItem[];
  status: OrderStatus;
  createdAt: number;
  updatedAt: number;
}

/**
 * Returns the next status in the happy-path progression, or null when
 * the order is in a terminal state (completed / cancelled).
 */
export function nextStatus(current: OrderStatus): OrderStatus | null {
  switch (current) {
    case 'pending':
      return 'in_progress';
    case 'in_progress':
      return 'ready';
    case 'ready':
      return 'completed';
    case 'completed':
    case 'cancelled':
      return null;
  }
}
