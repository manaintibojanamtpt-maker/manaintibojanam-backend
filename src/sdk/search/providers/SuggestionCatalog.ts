/**
 * SearchSDK — static suggestion catalog (M4 PR-9).
 * Placeholder strategy for popular / trending until index-backed signals land.
 */

import type { SearchSuggestion } from '../dto';

const cuisine = (slug: string, label: string, score: number): SearchSuggestion => ({
  id: `cuisine-${slug}`,
  label,
  kind: 'cuisine',
  score,
  payload: { slug },
});

const restaurant = (id: string, label: string, score: number): SearchSuggestion => ({
  id: `restaurant-${id}`,
  label,
  kind: 'restaurant',
  score,
  payload: { placeholder: 'true' },
});

export const POPULAR_CUISINE_SUGGESTIONS: readonly SearchSuggestion[] = [
  cuisine('biryani', 'Biryani', 0.95),
  cuisine('south-indian', 'South Indian', 0.9),
  cuisine('north-indian', 'North Indian', 0.88),
  cuisine('chinese', 'Chinese', 0.86),
  cuisine('pizza', 'Pizza', 0.84),
  cuisine('burger', 'Burger', 0.82),
  cuisine('pure-veg', 'Pure Veg', 0.8),
];

export const NEARBY_CUISINE_SUGGESTIONS: readonly SearchSuggestion[] = [
  cuisine('biryani', 'Biryani near you', 0.75),
  cuisine('south-indian', 'South Indian near you', 0.72),
  cuisine('street-food', 'Street Food near you', 0.7),
];

/** Placeholder until trending index is available. */
export const TRENDING_RESTAURANT_SUGGESTIONS: readonly SearchSuggestion[] = [
  restaurant('trending-1', 'Trending kitchens (coming soon)', 0.5),
];

export const filterCatalogByPrefix = (
  catalog: readonly SearchSuggestion[],
  prefix: string,
  limit = 8
): SearchSuggestion[] => {
  const normalized = prefix.trim().toLowerCase();
  if (!normalized) {
    return [...catalog].slice(0, limit);
  }

  return catalog
    .filter((entry) => entry.label.toLowerCase().includes(normalized))
    .slice(0, limit);
};
