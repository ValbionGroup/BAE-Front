/**
 * Formate un montant **en centimes** pour l'affichage : `250` → `'2,50'`.
 *
 * Les centimes sont l'unité de transport (`event_products.price` est un entier),
 * précisément pour qu'aucun flottant ne s'approche d'une somme d'argent. La
 * conversion n'a donc lieu qu'au dernier moment, à l'affichage.
 */
export function formatCents(cents: number): string {
  return (cents / 100).toFixed(2).replace('.', ',');
}
