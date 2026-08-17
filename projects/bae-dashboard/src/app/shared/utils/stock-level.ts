/**
 * Niveau de stock **vendable** d'une recette pendant le service.
 *
 * La source est `sellable` : `remainingQty = producedQty − soldQty`. Le stock
 * d'ingrédients n'entre pas ici — il sort à la production, pas à la vente.
 */
export type StockLevel = 'unknown' | 'out' | 'low' | 'ok';

/**
 * Plancher absolu : en dessous, c'est critique quelle que soit la recette.
 *
 * Une part de ce qui a été produit ne suffit pas seule : 10 % de 20 fait 2, et
 * personne ne relance une fournée quand il en reste deux.
 */
export const LOW_STOCK_FLOOR = 10;

/**
 * Part de la production en dessous de laquelle on alerte.
 *
 * Le plancher seul ne suffit pas non plus : une recette lancée à 220 qui
 * n'alerterait qu'à 10 restantes préviendrait trop tard pour relancer.
 */
export const LOW_STOCK_RATIO = 0.1;

/**
 * ⚠️ **`producedQty === 0` rend `unknown`, jamais `out`.**
 *
 * Le restant se déduit de ce qui a été produit. Une soirée qui ne déclare
 * aucune production laisse donc `remainingQty` à zéro partout — et une lecture
 * naïve désactiverait la totalité de la caisse, sans que rien ne soit
 * réellement en rupture. Absence d'information n'est pas absence de stock : cet
 * état existe pour que le doute n'empêche jamais de vendre.
 */
export function stockLevelOf(remainingQty: number, producedQty: number): StockLevel {
  if (producedQty <= 0) return 'unknown';
  if (remainingQty <= 0) return 'out';
  if (remainingQty <= Math.max(LOW_STOCK_FLOOR, producedQty * LOW_STOCK_RATIO)) return 'low';
  return 'ok';
}

/** Seul le vrai zéro, constaté sur une production déclarée, empêche de vendre. */
export function blocksSale(level: StockLevel): boolean {
  return level === 'out';
}
