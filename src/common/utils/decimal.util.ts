import { Prisma } from '@prisma/client';

export function decimalToNumber(value: Prisma.Decimal | null | undefined) {
  return value == null ? value : Number(value.toString());
}

export function convertDecimalsToNumbers<T>(input: T): T {
  if (input instanceof Prisma.Decimal) {
    return Number(input.toString()) as T;
  }

  if (Array.isArray(input)) {
    return input.map((item) => convertDecimalsToNumbers(item)) as T;
  }

  if (input && typeof input === 'object') {
    const entries = Object.entries(input).map(([key, value]) => [
      key,
      convertDecimalsToNumbers(value),
    ]);

    return Object.fromEntries(entries) as T;
  }

  return input;
}
