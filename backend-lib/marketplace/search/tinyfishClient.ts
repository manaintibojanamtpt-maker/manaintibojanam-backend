import { readTinyFishSearchConfig, type TinyFishSearchConfig } from './tinyfishConfig.js';

export interface TinyFishSearchResult {
  readonly title?: string;
  readonly snippet?: string;
  readonly url?: string;
}

export interface TinyFishSearchResponse {
  readonly results: readonly TinyFishSearchResult[];
}

export type TinyFishFetch = typeof fetch;

const STOP_WORDS = new Set([
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'by',
  'for',
  'from',
  'in',
  'is',
  'it',
  'menu',
  'of',
  'on',
  'or',
  'restaurant',
  'the',
  'to',
  'with',
  'food',
  'dish',
  'dishes',
  'indian',
  'delivery',
  'order',
  'online',
  'near',
  'me',
]);

const queryExpansionCache = new Map<string, { expiresAt: number; terms: readonly string[] }>();

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2 && !STOP_WORDS.has(token));
}

export function extractSearchTermsFromTinyFishResponse(
  query: string,
  response: TinyFishSearchResponse,
): string[] {
  const terms = new Set<string>([query.trim()]);
  for (const result of response.results) {
    for (const token of tokenize(result.title ?? '')) terms.add(token);
    for (const token of tokenize(result.snippet ?? '')) terms.add(token);
  }
  return [...terms].filter(Boolean);
}

export async function fetchTinyFishQueryTerms(
  query: string,
  options?: {
    readonly config?: TinyFishSearchConfig | null;
    readonly fetchImpl?: TinyFishFetch;
    readonly now?: number;
  },
): Promise<readonly string[]> {
  const normalizedQuery = query.trim();
  if (!normalizedQuery) return [];

  const config = options?.config ?? readTinyFishSearchConfig();
  if (!config?.enabled) return [normalizedQuery];

  const now = options?.now ?? Date.now();
  const cacheKey = `${config.location}:${config.language}:${normalizedQuery.toLowerCase()}`;
  const cached = queryExpansionCache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.terms;
  }

  const fetchImpl = options?.fetchImpl ?? fetch;
  const params = new URLSearchParams({
    query: `${normalizedQuery} Indian restaurant menu dish`,
    location: config.location,
    language: config.language,
    purpose:
      'Find matching Indian restaurant menu dish names, categories, and cuisine synonyms for food delivery search',
  });

  const response = await fetchImpl(`https://api.search.tinyfish.ai?${params.toString()}`, {
    method: 'GET',
    headers: {
      'X-API-Key': config.apiKey,
      Accept: 'application/json',
    },
    signal: AbortSignal.timeout(config.timeoutMs),
  });

  if (!response.ok) {
    throw new Error(`TinyFish search failed with status ${response.status}`);
  }

  const body = (await response.json()) as TinyFishSearchResponse;
  const terms = extractSearchTermsFromTinyFishResponse(normalizedQuery, {
    results: Array.isArray(body.results) ? body.results : [],
  });

  queryExpansionCache.set(cacheKey, {
    expiresAt: now + config.cacheTtlMs,
    terms,
  });

  return terms;
}

export function resetTinyFishQueryExpansionCacheForTests(): void {
  queryExpansionCache.clear();
}
