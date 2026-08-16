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
  /**
   * A un compte mais aucune cotisation. Un compte client naît d'une connexion
   * EirbConnect ; l'adhésion en est une suite possible, pas une conséquence —
   * on peut n'avoir qu'un compte, à présenter à la caisse.
   */
  readonly withoutSubscription: number;
  readonly expiringSoon: number;
}

/**
 * Delta d'édition. Ni email ni nom : ils viennent des claims EirbConnect, et le
 * bureau ne fabrique pas d'identité. Il n'existe pas de charge utile de
 * création — aucune route ne crée de compte client.
 */
export interface ClientWritePayload {
  readonly phone?: string | null;
  readonly promotion?: string | null;
  readonly note?: string | null;
}
