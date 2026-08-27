import type { StockProduct } from './stocks.types';

/**
 * La recherche de denrée, partagée par les écrans qui en font choisir une :
 * le rattachement d'un code inconnu et l'entrée de stock manuelle.
 *
 * Marque et catégorie comptent autant que le nom : on cherche « Amora » sans se
 * rappeler que la denrée s'appelle « Moutarde ».
 */
export function filterProducts(
  products: readonly StockProduct[],
  query: string,
  max: number,
): readonly StockProduct[] {
  const needle = query.trim().toLowerCase();
  const matching =
    needle === ''
      ? products
      : products.filter(
          (product) =>
            product.name.toLowerCase().includes(needle) ||
            product.brand?.toLowerCase().includes(needle) ||
            product.categoryName.toLowerCase().includes(needle),
        );
  return matching.slice(0, max);
}

/**
 * Lit une quantité saisie, ou `null` si la saisie n'en est pas une.
 *
 * ⚠️ Une **quantité**, pas un montant : `parseEuros` ne convient pas ici, il
 * rend des centimes. Les unités de stock sont `pcs`, `kg` et `liter`, donc les
 * décimales sont légitimes — et un clavier français produit une virgule.
 *
 * Zéro et les négatifs sont refusés : entrer ou sortir « rien » n'est pas un
 * geste, et c'est aussi ce que l'API refuse (`vine.number().positive()`).
 */
export function parseQuantity(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.');
  if (cleaned === '') return null;
  const value = Number(cleaned);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}
