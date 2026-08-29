import { addYears } from 'date-fns';
import { parseApiDate } from './api-date';

/**
 * Date d'expiration d'une cotisation : `subscribedAt + duration` **années**.
 *
 * ⚠️ Cette fonction n'est là que pour l'**aperçu avant création** — partout
 * ailleurs, `expiresAt` et `status` arrivent déjà calculés par l'API
 * (`BAE-Back/app/services/subscription_service.ts`), et c'est cette valeur-là
 * qui fait foi. La règle est dupliquée ici parce qu'aucune ligne n'existe encore
 * côté serveur au moment où l'écran l'affiche.
 *
 * ⚠️ `addYears` et non `setFullYear` : le back calcule avec Luxon, qui **borne**
 * le jour au dernier du mois d'arrivée. `setFullYear` ne le borne pas — un
 * 29 février y devient un 1er mars, et l'aperçu annonçait alors un jour de plus
 * que la date effectivement enregistrée.
 *
 * Rend `null` si la date est absente ou illisible, à charge de l'appelant de
 * n'afficher aucun aperçu dans ce cas.
 */
export function subscriptionExpiry(subscribedAt: string, durationYears: number): Date | null {
  if (subscribedAt === '') return null;

  const start = parseApiDate(subscribedAt);
  if (Number.isNaN(start.getTime())) return null;

  return addYears(start, durationYears);
}
