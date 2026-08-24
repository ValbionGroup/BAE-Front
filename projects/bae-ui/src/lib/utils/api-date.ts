import { format, parseISO } from 'date-fns';

/**
 * Lit une date servie par l'API.
 *
 * ⚠️ `new Date(iso)` ne convient pas : sur une date **sans heure**
 * (`YYYY-MM-DD`, ce que rendent `toISODate()` et les colonnes `@column.date()`),
 * il applique la règle ISO « date seule = UTC ». Réaffichée en heure locale,
 * elle recule d'un jour à l'ouest de Greenwich — une adhésion finit la veille,
 * un lot est périmé le matin de sa DLC. Une date sans heure désigne un jour,
 * pas un instant.
 *
 * Les horodatages complets portent leur décalage et traversent inchangés.
 */
export function parseApiDate(iso: string): Date {
  return parseISO(iso);
}

/** `JJ/MM/AAAA`, ou `fallback` si la date est absente ou illisible. */
export function formatApiDate(iso: string | null | undefined, fallback = '—'): string {
  if (!iso) return fallback;

  const date = parseApiDate(iso);
  return Number.isNaN(date.getTime()) ? fallback : format(date, 'dd/MM/yyyy');
}
