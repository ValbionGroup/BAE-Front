/** `none` : la personne est enregistrée mais n'a jamais cotisé. */
export type MembershipStatus = 'active' | 'expired' | 'none';

export interface ClientRow {
  readonly id: number;
  readonly membershipNumber: string;
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
  readonly amount: number | null;
  readonly paymentMethod: string | null;
}

export interface ClientDetail extends ClientRow {
  readonly school: string | null;
  readonly phone: string | null;
  readonly registeredAt: string;
  readonly note: string | null;
  readonly noteAuthor: string | null;
  readonly noteWrittenAt: string | null;
  readonly subscriptions: readonly SubscriptionRow[];
  readonly preOrderCount: number;
  readonly spentCents: number;
}

export interface ClientsSummary {
  readonly total: number;
  readonly upToDate: number;
  readonly expired: number;
  readonly withoutSubscription: number;
  readonly expiringSoon: number;
}

export interface ClientWritePayload {
  readonly phone?: string | null;
  readonly note?: string | null;
}
