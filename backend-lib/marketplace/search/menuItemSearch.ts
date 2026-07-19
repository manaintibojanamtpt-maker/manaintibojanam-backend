import { classifyTextMatch, normalizeForMatch } from '../../shared/serverBundleHelpers.js';
import { isTinyFishMenuSearchEnabled, readTinyFishSearchConfig, type TinyFishSearchConfig } from './tinyfishConfig.js';
import { fetchTinyFishQueryTerms, type TinyFishFetch } from './tinyfishClient.js';

export interface SearchMenuItem {
  readonly id: string;
  readonly tenantId: string;
  readonly restaurantSlug: string;
  readonly name: string;
  readonly category: string;
  readonly description?: string;
  readonly image?: string;
  readonly price: number;
  readonly isVeg: boolean;
}

export interface MenuItemSearchResult {
  readonly items: readonly SearchMenuItem[];
  readonly provider: 'tinyfish-menu-search' | 'firestore-menu-search';
  readonly tookMs: number;
}

interface RankedMenuItem {
  readonly item: SearchMenuItem;
  readonly score: number;
}

function scoreMenuItem(item: SearchMenuItem, terms: readonly string[]): number {
  let best = 0;
  for (const term of terms) {
    const normalizedTerm = normalizeForMatch(term);
    if (!normalizedTerm) continue;
    const nameMatch = classifyTextMatch(normalizedTerm, item.name, 'name');
    const categoryMatch = classifyTextMatch(normalizedTerm, item.category, 'category');
    const descriptionMatch = classifyTextMatch(normalizedTerm, item.description ?? '', 'description');
    best = Math.max(
      best,
      nameMatch.signal,
      categoryMatch.signal * 0.9,
      descriptionMatch.signal * 0.75,
    );
  }
  return best;
}

export function rankMenuItemsByTerms(
  items: readonly SearchMenuItem[],
  terms: readonly string[],
  limit: number,
): SearchMenuItem[] {
  const normalizedTerms = terms.map((term) => term.trim()).filter(Boolean);
  if (normalizedTerms.length === 0) return items.slice(0, limit);

  return items
    .map((item): RankedMenuItem => ({ item, score: scoreMenuItem(item, normalizedTerms) }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => right.score - left.score || left.item.name.localeCompare(right.item.name))
    .slice(0, limit)
    .map((entry) => entry.item);
}

export function searchMenuItemsLocally(
  query: string,
  items: readonly SearchMenuItem[],
  limit: number,
): SearchMenuItem[] {
  const normalizedQuery = normalizeForMatch(query);
  if (!normalizedQuery) return items.slice(0, limit);
  return rankMenuItemsByTerms(items, [query], limit);
}

export async function searchMenuItems(
  query: string,
  items: readonly SearchMenuItem[],
  limit: number,
  options?: {
    readonly fetchImpl?: TinyFishFetch;
    readonly tinyFishEnabled?: boolean;
    readonly config?: TinyFishSearchConfig | null;
  },
): Promise<MenuItemSearchResult> {
  const started = Date.now();
  const tinyFishEnabled = options?.tinyFishEnabled ?? isTinyFishMenuSearchEnabled();
  const config = options?.config ?? readTinyFishSearchConfig();

  if (tinyFishEnabled && config?.enabled) {
    try {
      const terms = await fetchTinyFishQueryTerms(query, {
        fetchImpl: options?.fetchImpl,
        config,
      });
      const ranked = rankMenuItemsByTerms(items, terms, limit);
      if (ranked.length > 0) {
        return {
          items: ranked,
          provider: 'tinyfish-menu-search',
          tookMs: Date.now() - started,
        };
      }
    } catch {
      // Fall back to local Firestore-backed matching below.
    }
  }

  return {
    items: searchMenuItemsLocally(query, items, limit),
    provider: 'firestore-menu-search',
    tookMs: Date.now() - started,
  };
}
