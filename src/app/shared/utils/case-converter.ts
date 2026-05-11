export function removeAccents(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/ø/g, 'o')
    .replace(/Ø/g, 'O');
}

export function toCamelCase(key: string): string {
  return key.replace(/_([a-z])/g, (_, char: string) => char.toUpperCase());
}

export function toSnakeCase(key: string): string {
  const res = key.replace(/([A-Z])/g, (_, char: string) => `_${char.toLowerCase()}`);
  return res.startsWith('_') ? res.slice(1) : res;
}

export function toScreamingSnakeCase(key: string): string {
  if (key === key.toUpperCase() && key.includes('_')) {
    return key;
  }

  const res = key
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2') // Split acronyms: "APIKey" -> "API_Key"
    .replace(/([a-z\d])([A-Z])/g, '$1_$2'); // Split camelCase: "userId" -> "user_Id"

  return res.toUpperCase();
}

export function convertKeysToCamelCase(input: any, ignoreKeys: string[] = []): any {
  if (Array.isArray(input)) {
    return input.map((item) => convertKeysToCamelCase(item, ignoreKeys));
  } else if (input !== null && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => {
        return [
          toCamelCase(key),
          ignoreKeys.includes(key) ? value : convertKeysToCamelCase(value, ignoreKeys)
        ];
      })
    );
  }
  return input;
}

export function convertKeysToSnakeCase(input: any, ignoreKeys: string[] = []): any {
  if (Array.isArray(input)) {
    return input.map((item) => convertKeysToSnakeCase(item, ignoreKeys));
  } else if (input !== null && typeof input === 'object') {
    return Object.fromEntries(
      Object.entries(input).map(([key, value]) => [
        toSnakeCase(key),
        ignoreKeys.includes(key) ? value : convertKeysToSnakeCase(value, ignoreKeys)
      ])
    );
  }
  return input;
}

export function capitalizeFirst(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
