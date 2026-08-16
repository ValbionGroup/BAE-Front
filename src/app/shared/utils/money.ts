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

/**
 * Lit une saisie en euros et rend des **centimes**, ou `null` si ce n'est pas
 * un montant : `'12,50'` → `1250`, `'12.5'` → `1250`, `'12'` → `1200`.
 *
 * La virgule est acceptée autant que le point : au comptoir on tape sur le
 * pavé numérique, dont la touche décimale produit l'un ou l'autre selon le
 * clavier. Le `Math.round` final est ce qui empêche `19.99 * 100` de valoir
 * `1998.9999999999998`.
 */
export function parseEuros(input: string): number | null {
  const cleaned = input.trim().replace(/\s/g, '').replace(',', '.');
  if (cleaned === '' || !/^\d*\.?\d*$/.test(cleaned)) return null;

  const euros = Number(cleaned);
  if (!Number.isFinite(euros) || euros < 0) return null;
  return Math.round(euros * 100);
}
