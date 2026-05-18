export function parseArrayValue(value?: string | string[]): string[] | undefined {
  if (!value) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) =>
      item
        .split(',')
        .map((part) => part.trim())
        .filter(Boolean),
    );
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}
