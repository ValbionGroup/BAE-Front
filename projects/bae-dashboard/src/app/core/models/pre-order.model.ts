import type { OrderStatus } from '#core/models/order.model';

export interface PreOrderLine {
  readonly productId: number;
  readonly productName: string;
  readonly quantity: number;
  /** Déjà remis. `collect()` l'aligne sur `quantity` d'un coup. */
  readonly receivedQuantity: number;
}

/**
 * Une précommande vue depuis la cuisine.
 *
 * Elle partage les cinq statuts d'une commande — la table de transitions est la
 * **même** côté serveur —, mais pas son horloge : son délai se mesure à l'heure
 * de retrait choisie par le client, pas au rythme du service. D'où l'absence de
 * montant : elle a été payée un autre jour et ne compte ni dans la recette du
 * soir ni dans les temps moyens.
 */
export interface PreOrderTicket {
  readonly id: number;
  /** Repère du comptoir, préfixé pour ne pas se confondre avec un n° de commande. */
  readonly reference: string;
  readonly eventId: number;
  readonly status: OrderStatus;
  readonly clientName: string;
  readonly lines: readonly PreOrderLine[];
  readonly paid: boolean;
  readonly fullyCollected: boolean;
  /** ISO 8601, ou `null` quand le client n'a pas choisi d'heure. */
  readonly pickupAt: string | null;
  /**
   * L'heure de retrait approche : la cuisine doit s'y mettre. **Calculé côté
   * serveur** (`pickup_at − 15 min`), jamais ici — le front n'a pas à connaître
   * le délai de préparation, et deux horloges donneraient deux réponses.
   */
  readonly due: boolean;
  /** Allergies et consignes déclarées par le client sur son profil. */
  readonly preparationNote: string | null;
  readonly createdAt: string | null;
}
