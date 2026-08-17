import { LoadingStatus } from '#core/models/global.model';

export enum Presence {
  PENDING = -1,
  PRESENT = 1,
  ABSENT = 0,
}

/** L'enum `events.status` en base. `GET /events` le renvoie déjà. */
export type EventStatus = 'scheduled' | 'ongoing' | 'completed';

export interface EventData {
  id: string;
  name: string;
  location: string;
  date: Date;
  description?: string;
  duration?: number;
  /**
   * ⚠️ `EventsService.toEventData()` laissait tomber cette colonne alors que
   * l'API la renvoie. Le badge d'état de la carte de soirée en a besoin.
   *
   * Ne pas confondre avec `location` juste au-dessus, qui n'a **aucune colonne
   * derrière** (`events` porte name, description, date, status, duration) et
   * vaut donc `undefined` à l'exécution depuis toujours.
   */
  status?: EventStatus;
  /**
   * Nombre de **personnes** affectées à la soirée — tenir deux postes n'en fait
   * pas deux. Le héros de l'accueil le reconstituait depuis `GET /assignments`,
   * réservé à la coordination, et affichait donc « 0 » à tout autre membre.
   */
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

/**
 * Une ligne du menu d'une soirée — le pivot `event_products`.
 *
 * Cette interface existait déjà, avec `servings` / `category` / `prepNotes`, et
 * **rien ne l'alimentait** : la seule occurrence de `menuStatus` dans le dépôt
 * était `'init'` dans `toEventsDict()`. C'était une amorce laissée par la
 * conception d'origine ; elle est ici remise à la forme que l'API renvoie.
 *
 * `quantity` est la quantité de production. `price` est le prix de **vente** en
 * centimes — aucun écran ne l'édite, il est transporté pour la caisse.
 * `unitCost` / `totalCost` sont le coût des **denrées**, `null` dès qu'un
 * ingrédient n'a aucun fournisseur : un coût partiel serait plus trompeur qu'un
 * coût absent.
 */
export interface MenuItem {
  readonly productId: number;
  readonly name: string;
  readonly isVegetarian: boolean;
  readonly quantity: number;
  readonly price: number;
  readonly unitCost: number | null;
  readonly totalCost: number | null;
  /** Catégorie dérivée côté back de l'ingrédient de plus bas `rank` — `products`
   *  n'a pas de catégorie propre. `null` quand la recette n'a aucun ingrédient
   *  catégorisé. */
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
