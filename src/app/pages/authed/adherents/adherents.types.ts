/** `none` : la personne est enregistrée mais n'a jamais cotisé. */
export type MembershipStatus = 'active' | 'expired' | 'none';

export interface ClientRow {
  readonly id: number;
  readonly membershipNumber: string;
  /** `null` tant qu'aucun nom n'est connu : `users.first_name` est nullable. */
  readonly name: string | null;
  readonly email: string;
  readonly promotion: string | null;
  readonly status: MembershipStatus;
  readonly expiresAt: string | null;
  readonly daysUntilExpiry: number | null;
}

export interface SubscriptionRow {
  readonly fastPassId: number;
  readonly label: string;
  readonly subscribedAt: string;
  readonly expiresAt: string;
  readonly status: 'active' | 'expired';
  /** `null` quand aucune transaction n'est rattachée (cotisation offerte). */
  readonly amount: number | null;
  readonly paymentMethod: string | null;
}

export interface ClientDetail extends ClientRow {
  readonly phone: string | null;
  readonly registeredAt: string;
  readonly note: string | null;
  readonly noteAuthor: string | null;
  readonly noteWrittenAt: string | null;
  readonly subscriptions: readonly SubscriptionRow[];
}

export interface ClientsSummary {
  readonly total: number;
  readonly upToDate: number;
  readonly expired: number;
  /** Enregistré, jamais cotisé — l'onglet « Externes » de la maquette. */
  readonly external: number;
  readonly expiringSoon: number;
}

export interface ClientWritePayload {
  readonly email: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly phone?: string | null;
  readonly promotion?: string | null;
}
