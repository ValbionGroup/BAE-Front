/**
 * Pas des créneaux de retrait, en minutes.
 *
 * Doit rester d'accord avec `PICKUP_SLOT_MINUTES` côté back : c'est lui qui
 * refuse un créneau mal aligné, cette liste ne fait que proposer. Un désaccord
 * ne produirait pas un écran faux, mais des choix systématiquement rejetés.
 */
export const PICKUP_SLOT_MINUTES = 15;

/**
 * Durée retenue quand la soirée n'en porte pas — `events.duration` est nullable.
 *
 * ⚠️ Doit rester d'accord avec `DEFAULT_EVENT_DURATION_SECONDS` côté back, qui
 * porte la règle. L'unité est la **seconde**, celle qu'écrit `calcDuration`.
 */
export const DEFAULT_EVENT_DURATION_SECONDS = 4 * 60 * 60;

/**
 * Fin de la fenêtre de retrait, à partir du début de la soirée et de sa durée.
 *
 * L'API publique renvoie déjà cette borne (`endsAt`) : cette fonction est pour
 * le dashboard, dont l'événement porte une durée brute.
 */
export function pickupWindowEnd(startIso: string, durationSeconds: number | null): string {
  const start = new Date(startIso);
  if (Number.isNaN(start.getTime())) return startIso;

  const seconds = durationSeconds ?? DEFAULT_EVENT_DURATION_SECONDS;

  return new Date(start.getTime() + seconds * 1000).toISOString();
}

export interface PickupSlot {
  /** ISO 8601, ce qui part à l'API. */
  readonly value: string;
  /** `20:45`, ce que lit un humain. */
  readonly label: string;
}

/**
 * Les créneaux de retrait d'une soirée, du premier quart d'heure plein à la fin.
 *
 * Partagé par les deux applications — le client choisit son créneau en
 * commandant, le staff le déplace ensuite — pour qu'aucune des deux ne propose
 * une heure que l'autre ne saurait pas reprendre.
 *
 * Le premier créneau est arrondi **vers le haut** : une soirée qui commence à
 * 20 h 05 n'offre pas de retrait à 20 h 00, qui serait déjà passé.
 */
export function buildPickupSlots(startIso: string, endIso: string): PickupSlot[] {
  const start = new Date(startIso);
  const end = new Date(endIso);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return [];

  const slots: PickupSlot[] = [];
  const cursor = new Date(start);
  cursor.setSeconds(0, 0);

  const overshoot = cursor.getMinutes() % PICKUP_SLOT_MINUTES;
  if (overshoot !== 0 || cursor < start) {
    cursor.setMinutes(cursor.getMinutes() + (PICKUP_SLOT_MINUTES - overshoot));
  }

  while (cursor <= end) {
    slots.push({ value: cursor.toISOString(), label: formatPickupSlot(cursor.toISOString()) });
    cursor.setMinutes(cursor.getMinutes() + PICKUP_SLOT_MINUTES);
  }

  return slots;
}

/** `'2026-02-14T20:45:00Z'` → `'21:45'` (heure locale du lecteur). */
export function formatPickupSlot(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
}
