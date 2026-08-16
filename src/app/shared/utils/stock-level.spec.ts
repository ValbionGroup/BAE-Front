import { blocksSale, stockLevelOf } from './stock-level';

describe('stockLevelOf', () => {
  /**
   * La garde qui compte : sans elle, une soirée sans production déclarée
   * affichait toute sa carte en rupture et la caisse ne vendait plus rien.
   */
  it('ne conclut rien tant qu’aucune production n’est déclarée', () => {
    expect(stockLevelOf(0, 0)).toBe('unknown');
    expect(blocksSale(stockLevelOf(0, 0))).toBe(false);
  });

  it('bloque la vente au zéro constaté, et seulement là', () => {
    expect(stockLevelOf(0, 200)).toBe('out');
    expect(blocksSale(stockLevelOf(0, 200))).toBe(true);
    expect(blocksSale(stockLevelOf(1, 200))).toBe(false);
  });

  it('alerte à un dixième sur une grosse production', () => {
    // 220 produits : le plancher de 10 arriverait trop tard pour relancer.
    expect(stockLevelOf(22, 220)).toBe('low');
    expect(stockLevelOf(23, 220)).toBe('ok');
  });

  it('garde le plancher sur une petite production', () => {
    // 10 % de 40 ferait 4 : personne ne relance une fournée à 4 restantes.
    expect(stockLevelOf(10, 40)).toBe('low');
    expect(stockLevelOf(11, 40)).toBe('ok');
  });

  it('ne descend jamais sous le plancher, même sur une très petite série', () => {
    expect(stockLevelOf(9, 20)).toBe('low');
  });
});
