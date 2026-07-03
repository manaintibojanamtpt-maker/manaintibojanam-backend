/**
 * ReferenceSDK — list filter helpers for repository queries.
 */

interface ActiveFilterable {
  readonly active: boolean;
}

export function applyActiveFilter<T extends ActiveFilterable>(
  items: readonly T[],
  includeInactive?: boolean
): T[] {
  if (includeInactive) {
    return [...items];
  }
  return items.filter((item) => item.active);
}

export function applyLimit<T>(items: readonly T[], limit?: number): T[] {
  if (limit === undefined || limit < 0) {
    return [...items];
  }
  return items.slice(0, limit);
}

export function applyIsoCodeFilter<T extends { isoCode?: string; officialCode?: string }>(
  items: readonly T[],
  isoCode?: string
): T[] {
  if (!isoCode) {
    return [...items];
  }
  const normalized = isoCode.trim().toUpperCase();
  return items.filter(
    (item) =>
      item.isoCode?.toUpperCase() === normalized ||
      item.officialCode?.toUpperCase() === normalized
  );
}
