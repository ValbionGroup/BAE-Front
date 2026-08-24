export interface PublicEvent {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly startsAt: string;
  /** Fin de la soirée, donc dernier créneau de retrait proposable. */
  readonly endsAt: string;
  readonly preOrdersCloseAt: string;
  readonly capacity: number;
  readonly placed: number;
  readonly remaining: number;
  readonly open: boolean;
}

export interface PublicMenuLine {
  readonly productId: number;
  readonly name: string;
  readonly description: string | null;
  readonly isVegetarian: boolean;
  readonly price: number;
  readonly category: string | null;
}

export interface PublicMenu {
  readonly event: PublicEvent;
  readonly discountPercent: number;
  readonly closeLeadHours: number;
  readonly lines: readonly PublicMenuLine[];
}

export interface PublicFastPass {
  readonly id: number;
  readonly label: string;
  readonly description: string | null;
  readonly durationYears: number;
  readonly priceCents: number;
}

export interface PublicFastPassCatalog {
  readonly bonusPercent: number;
  readonly plans: readonly PublicFastPass[];
}

export type LoadingStatus = 'init' | 'loading' | 'loaded' | 'error';
