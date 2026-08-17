import { formatPointsDelta } from './points-delta';

describe('formatPointsDelta', () => {
  it('signs a positive delta and pluralises the unit', () => {
    expect(formatPointsDelta(6)).toBe('+6 pts');
  });

  it('keeps the sign on a negative delta rather than hiding it', () => {
    expect(formatPointsDelta(-6)).toBe('-6 pts');
  });

  it('uses the singular unit at ±1', () => {
    expect(formatPointsDelta(1)).toBe('+1 pt');
    expect(formatPointsDelta(-1)).toBe('-1 pt');
  });

  it('prints a zero delta the same way everywhere: never a bare 0 or a dot', () => {
    expect(formatPointsDelta(0)).toBe('0 pt');
  });
});
