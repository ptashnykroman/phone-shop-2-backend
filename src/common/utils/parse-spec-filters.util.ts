export interface ParsedSpecificationFilter {
  key: string;
  value: string;
}

export function parseSpecificationFilters(
  value?: string,
): ParsedSpecificationFilter[] {
  if (!value) {
    return [];
  }

  return value
    .split(',')
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) => {
      const [key, filterValue] = chunk.split(':');
      return {
        key: key?.trim() ?? '',
        value: filterValue?.trim() ?? '',
      };
    })
    .filter((item) => item.key.length > 0 && item.value.length > 0);
}
