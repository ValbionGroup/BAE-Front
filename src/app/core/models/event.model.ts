import { LoadingStatus } from '#core/models/global.model';

export enum Presence {
  PENDING = -1,
  PRESENT = 1,
  ABSENT = 0,
}

export type EventStatus = 'scheduled' | 'ongoing' | 'completed';

export interface EventData {
  id: string;
  name: string;
  location: string;
  date: Date;
  description?: string;
  duration?: number;
  status?: EventStatus;
  assigneeCount?: number;
}

export interface EventDetail extends EventData {
  memberPresence?: Presence;
  memberPresenceStatus?: LoadingStatus;

  roster?: RosterRow[];
  rosterStatus?: LoadingStatus;

  menu?: MenuItem[];
  menuStatus?: LoadingStatus;
}

export interface RosterRow {
  id: string;
  name: string;
  role: string;
  status: Presence;
  when: Date;
  late: boolean;
}

export interface MenuItem {
  readonly productId: number;
  readonly name: string;
  readonly isVegetarian: boolean;
  readonly quantity: number;
  readonly price: number;
  readonly unitCost: number | null;
  readonly totalCost: number | null;
  readonly category: string | null;
}

export interface EventApiDto {
  id: string;
  name: string;
  location: string;
  date: string;
  description?: string;
  duration?: number;
  status?: EventStatus;
  assigneeCount?: number;
}

export interface RosterRowApiDto {
  id: string;
  name: string;
  role: string;
  status: Presence;
  when: string;
  late: boolean;
}
