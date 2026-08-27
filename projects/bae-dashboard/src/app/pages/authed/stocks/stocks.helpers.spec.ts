import { filterProducts, parseQuantity } from './stocks.helpers';
import type { StockProduct } from './stocks.types';

function product(overrides: Partial<StockProduct> = {}): StockProduct {
  return {
    id: 1,
    name: 'Moutarde',
    unit: 'pcs',
    brand: 'Amora',
    categoryId: 2,
    categoryName: 'Épicerie',
    totalQty: 4,
    batchCount: 1,
    nearestDlc: null,
    nearestDlcStatus: 'none',
    expiredBatchCount: 0,
    soonBatchCount: 0,
    ...overrides,
  };
}

describe('filterProducts', () => {
  const list = [
    product({ id: 1, name: 'Moutarde', brand: 'Amora', categoryName: 'Épicerie' }),
    product({ id: 2, name: 'Bière blonde', brand: null, categoryName: 'Boisson' }),
  ];

  it('renders everything when nothing is typed', () => {
    expect(filterProducts(list, '', 40)).toHaveLength(2);
  });

  it('matches the name whatever the case', () => {
    expect(filterProducts(list, 'MOUT', 40).map((p) => p.id)).toEqual([1]);
  });

  /** On cherche « Amora » sans savoir que la denrée s'appelle « Moutarde ». */
  it('matches the brand and the category too', () => {
    expect(filterProducts(list, 'amora', 40).map((p) => p.id)).toEqual([1]);
    expect(filterProducts(list, 'boisson', 40).map((p) => p.id)).toEqual([2]);
  });

  /** Une marque nulle est la norme en base, pas un cas limite. */
  it('survives a product without a brand', () => {
    expect(() => filterProducts(list, 'zzz', 40)).not.toThrow();
    expect(filterProducts(list, 'zzz', 40)).toHaveLength(0);
  });

  it('caps the list so the search takes over', () => {
    expect(filterProducts(list, '', 1)).toHaveLength(1);
  });
});

describe('parseQuantity', () => {
  /** Les unités de stock sont `pcs`, `kg` et `liter` : 1,5 kg est une saisie
   *  normale, et le clavier français produit une virgule. */
  it('reads a French decimal', () => {
    expect(parseQuantity('1,5')).toBe(1.5);
  });

  it('reads a plain integer', () => {
    expect(parseQuantity(' 12 ')).toBe(12);
  });

  it.each(['', '0', '-3', 'beaucoup', '1,2,3'])('refuses %o', (raw) => {
    expect(parseQuantity(raw)).toBeNull();
  });
});
