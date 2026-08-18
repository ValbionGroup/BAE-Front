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
  /** Plafond de précommandes ; `0` ferme la soirée. */
  capacity?: number;
  expectedAttendees?: number | null;
  /** Non nul = la prise en charge est active sur cette soirée. */
  payerName?: string | null;
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

/**
 * ⚠️ **Deux unités cohabitent sur cette ligne.** `price` vient de
 * `event_products.price`, un `integer` en centimes ; `unitCost` et `totalCost`
 * sont dérivés des prix fournisseurs (`decimal`), donc en euros. Les formater
 * pareil affiche « 450,00 € » pour un burger à 4,50 €.
 */
export interface MenuItem {
  readonly productId: number;
  readonly name: string;
  readonly isVegetarian: boolean;
  readonly quantity: number;
  /** Centimes. `0` = aucun prix fixé. */
  readonly price: number;
  /** Euros. */
  readonly unitCost: number | null;
  /** Euros. */
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
  capacity?: number;
  expectedAttendees?: number | null;
  payerName?: string | null;
}

export interface RosterRowApiDto {
  id: string;
  name: string;
  role: string;
  status: Presence;
  when: string;
  late: boolean;
}
