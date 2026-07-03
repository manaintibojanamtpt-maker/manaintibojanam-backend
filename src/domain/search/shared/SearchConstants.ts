/**
 * Search domain — constants (M4 PR-2).
 */

export const SEARCH_MIN_QUERY_LENGTH = 1;

export const SEARCH_MAX_QUERY_LENGTH = 256;

export const SEARCH_MAX_TOKEN_COUNT = 32;

export const SEARCH_MIN_TOKEN_LENGTH = 2;

/** English stop words stripped during tokenization (India marketplace v1). */
export const SEARCH_STOP_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'at',
  'for',
  'in',
  'me',
  'my',
  'near',
  'of',
  'on',
  'the',
  'to',
]);

/** Normalized phrase → cuisine tag slugs for query inference. */
export const CUISINE_INFERENCE_PHRASES: Readonly<Record<string, readonly string[]>> = {
  biryani: ['biryani'],
  'south indian': ['south-indian'],
  'north indian': ['north-indian'],
  chinese: ['chinese'],
  pizza: ['pizza'],
  burger: ['burger'],
  dosa: ['south-indian'],
  idli: ['south-indian'],
  'pure veg': ['pure-veg', 'veg'],
  veg: ['veg'],
};

export const SEARCH_FIELD_NAMES = {
  RESTAURANT_NAME: 'name',
  RESTAURANT_SLUG: 'slug',
  CUISINE_TAGS: 'cuisineTags',
  FOOD_NAME: 'menu.name',
  AREA: 'area',
  TAG: 'tag',
} as const;

export const SEARCH_DOMAIN_VERSION = '0.1.0-domain' as const;
