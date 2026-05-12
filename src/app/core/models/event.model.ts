import { EventData, Role } from '#core/models/coordination.model';

export interface MenuItem {
  recipeId: string;
  recipeName: string;
  servings: number;
  prepNotes?: string;
}

/** Extended event with location and menu — used by EventsService and homepage/kitchen. */
export interface EventDetail extends EventData {
  location: string;
  menu: MenuItem[];
}

/** Re-export for convenience. */
export type { Role };
