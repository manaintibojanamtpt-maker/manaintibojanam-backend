/**
 * M4 PR-9 — presentation-layer suggestion catalog (static fallback).
 */

import type { AutocompleteItem } from './autocompleteTypes';

const cuisine = (slug: string, label: string, source: 'popular' | 'nearby'): AutocompleteItem => ({
  id: `${source}-cuisine-${slug}`,
  label,
  source,
  kind: 'cuisine',
  payload: { slug },
});

export const STATIC_POPULAR_CUISINES: readonly AutocompleteItem[] = [
  cuisine('biryani', 'Biryani', 'popular'),
  cuisine('south-indian', 'South Indian', 'popular'),
  cuisine('north-indian', 'North Indian', 'popular'),
  cuisine('chinese', 'Chinese', 'popular'),
  cuisine('pizza', 'Pizza', 'popular'),
];

export const STATIC_NEARBY_CUISINES: readonly AutocompleteItem[] = [
  cuisine('biryani', 'Biryani near you', 'nearby'),
  cuisine('south-indian', 'South Indian near you', 'nearby'),
  cuisine('street-food', 'Street Food near you', 'nearby'),
];

export const STATIC_TRENDING_PLACEHOLDER: readonly AutocompleteItem[] = [
  {
    id: 'trending-placeholder',
    label: 'Trending kitchens (coming soon)',
    source: 'trending',
    kind: 'restaurant',
    payload: { placeholder: 'true' },
  },
];

export const filterStaticCatalog = (
  catalog: readonly AutocompleteItem[],
  prefix: string,
  limit = 6
): AutocompleteItem[] => {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) {
    return [...catalog].slice(0, limit);
  }

  return catalog
    .filter((entry) => entry.label.toLowerCase().includes(normalized))
    .slice(0, limit);
};
