import type { SearchResultItem } from '@/types/marketplace-search';

function normalizeForMatch(value: string): string {
  return value
    .trim()
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function matchScore(query: string, item: SearchResultItem): number {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return 0;

  const fields = [item.label, item.subtitle ?? ''].map(normalizeForMatch).filter(Boolean);
  let best = 0;
  for (const field of fields) {
    if (field === normalizedQuery) best = Math.max(best, 1);
    else if (field.startsWith(normalizedQuery)) best = Math.max(best, 0.85);
    else if (field.includes(normalizedQuery)) best = Math.max(best, 0.65);
  }
  return best;
}

export function filterLocalMenuItems(
  query: string,
  items: readonly SearchResultItem[],
  limit: number,
): SearchResultItem[] {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return items.slice(0, limit);

  return items
    .map((item) => ({ item, score: matchScore(query, item) }))
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score || left.item.label.localeCompare(right.item.label),
    )
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function menuItemsToSuggestions(
  items: readonly SearchResultItem[],
): Array<{ id: string; label: string; type: 'food' }> {
  return items.map((item) => ({
    id: item.id,
    label: item.label,
    type: 'food' as const,
  }));
}
