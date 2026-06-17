import { LoadingStatus } from '#core/models/global.model';

export enum Presence {
  PENDING = -1,
  PRESENT = 1,
  ABSENT = 0,
}

export interface EventData {
  id: string;
  name: string;
  location: string;
  date: Date;
  description?: string;
  duration?: number;
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
  recipeId: string;
  recipeName: string;
  servings: number;
  price: number;
  category: string;
  prepNotes?: string;
}

export interface EventApiDto {
  id: string;
  name: string;
  location: string;
  date: string;
  description?: string;
  duration?: number;
}

export interface RosterRowApiDto {
  id: string;
  name: string;
  role: string;
  status: Presence;
  when: string;
  late: boolean;
}
