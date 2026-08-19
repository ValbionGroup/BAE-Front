import type { BadgeKind } from '@bae/ui';

export type EventStatus = 'preparing' | 'planning' | 'draft' | 'past';
export type TabKey = 'upcoming' | 'past';

export interface CoordinationEvent {
  readonly id: number;
  readonly name: string;
  readonly date: string;
  readonly rawDate: string;
  readonly status: EventStatus;
  readonly statusLabel: string;
  readonly statusKind: BadgeKind;
  readonly members: number;
  readonly maxMembers: number;
  readonly recipes: number;
  readonly duration: number | null;
  readonly description: string | null;
  /** Plafond de précommandes ; `0` = fermées. */
  readonly capacity: number;
  readonly expectedAttendees: number | null;
  readonly payerName: string | null;
  /** Heures avant le début ; `null` = suivre la valeur globale du serveur. */
  readonly preOrderCloseLeadHours: number | null;
}

export interface EditState {
  readonly id: string;
  readonly statusLabel: string;
  readonly statusKind: BadgeKind;
  readonly createdAt: string;
  name: string;
  date: string;
  time: string;
  endTime: string;
  description: string;
  recipes: string[];
  /** Plafond de précommandes ; `0` = fermées. Il n'y a pas de pause. */
  capacity: number;
  expectedAttendees: number | null;
  payerName: string | null;
  /** Heures avant le début ; `null` = suivre la valeur globale du serveur. */
  preOrderCloseLeadHours: number | null;
}
