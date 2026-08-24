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
  /**
   * ⚠️ **Aucune colonne `location` côté back** : ce champ est toujours absent
   * des réponses de l'API. Il reste déclaré parce que c'est un manque du back,
   * pas un champ à retirer de l'écran — mais le type ne le promet plus.
   */
  location?: string | null;
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

/**
 * La même soirée, telle qu'elle arrive sur le fil. **Dérivée** du modèle
 * applicatif et non redéclarée : les deux listes de champs avaient divergé, et
 * un ajout se payait en trois éditions dont deux que rien ne signalait si on
 * les oubliait — les champs sont optionnels, TypeScript ne dit rien.
 *
 * Ne restent écrits à la main que les champs dont la **forme** change.
 */
export type EventApiDto = Omit<EventData, 'id' | 'date'> & {
  /** L'API sert l'entier de la clé primaire, pas une chaîne. */
  readonly id: number;
  /** ISO 8601. */
  readonly date: string;
};

export type RosterRowApiDto = Omit<RosterRow, 'when'> & {
  /** ISO 8601. */
  readonly when: string;
};
