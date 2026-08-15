export type OrderStatus = 'pending' | 'in_progress' | 'ready' | 'completed' | 'cancelled';

export interface OrderLine {
  readonly productId: number;
  readonly productName: string;
  readonly quantity: number;
  /** En **centimes**, relu du menu de la soirée. */
  readonly unitPrice: number;
}

export interface Order {
  readonly id: number;
  /** Rang dans la soirée, dérivé côté serveur — aucune colonne ne le porte. */
  readonly number: number;
  readonly eventId: string;
  readonly status: OrderStatus;
  /** « Anonyme » quand aucun acheteur n'a été désigné, le cas courant. */
  readonly clientName: string;
  readonly lines: readonly OrderLine[];
  readonly totalCents: number;
  /** ISO 8601 — alimente le minuteur de la file cuisine. */
  readonly createdAt: string;
}

/**
 * Statut suivant dans la marche normale, `null` sur un état terminal.
 *
 * Décide quel bouton afficher, rien de plus : le serveur reste seul juge et
 * refuse toute transition illégale par un 409.
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
