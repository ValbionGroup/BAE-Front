import { formatCents, parseEuros } from './money';

describe('formatCents', () => {
  it('convertit les centimes en euros', () => {
    expect(formatCents(250)).toBe('2,50');
  });

  it('utilise la virgule décimale française', () => {
    expect(formatCents(1234)).toBe('12,34');
  });

  it('garde deux décimales sur un compte rond', () => {
    expect(formatCents(800)).toBe('8,00');
    expect(formatCents(0)).toBe('0,00');
  });

  it('gère un montant inférieur à un euro', () => {
    expect(formatCents(5)).toBe('0,05');
  });

  it('ne laisse pas fuir la représentation flottante', () => {
    // 1999 / 100 vaut 19.990000000000002 en flottant : `toFixed` doit absorber
    // l'écart plutôt que de l'afficher.
    expect(formatCents(1999)).toBe('19,99');
  });
});

describe('parseEuros', () => {
  it('accepte la virgule comme le point', () => {
    expect(parseEuros('12,50')).toBe(1250);
    expect(parseEuros('12.5')).toBe(1250);
    expect(parseEuros('12')).toBe(1200);
  });

  it('arrondit plutôt que de laisser passer le flottant', () => {
    // 19.99 * 100 vaut 1998.9999999999998.
    expect(parseEuros('19,99')).toBe(1999);
  });

  it('rejette ce qui n’est pas un montant', () => {
    for (const bad of ['', '  ', 'abc', '1,2,3', '-5', '1e3']) {
      expect(parseEuros(bad)).toBeNull();
    }
  });

  it('tolère les espaces de saisie', () => {
    expect(parseEuros(' 20 ')).toBe(2000);
  });
});
