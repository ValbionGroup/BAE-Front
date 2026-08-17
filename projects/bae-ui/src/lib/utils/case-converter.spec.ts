import {
  convertKeysToCamelCase,
  convertKeysToSnakeCase,
  toCamelCase,
  toSnakeCase,
} from './case-converter';

describe('case-converter', () => {
  it('converts snake_case to camelCase', () => {
    expect(toCamelCase('first_name')).toBe('firstName');
  });

  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('firstName')).toBe('first_name');
  });

  it('converts object keys to camelCase', () => {
    expect(convertKeysToCamelCase({ first_name: 'A' })).toEqual({ firstName: 'A' });
  });

  it('converts object keys to snake_case', () => {
    expect(convertKeysToSnakeCase({ firstName: 'A' })).toEqual({ first_name: 'A' });
  });
});
