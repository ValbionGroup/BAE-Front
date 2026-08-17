import type { BadgeKind } from '#shared/components/ui/badge/badge';

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
}

export interface OptionRow {
  readonly key: string;
  readonly label: string;
  readonly hint: string;
  enabled: boolean;
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
  readonly options: OptionRow[];
}
