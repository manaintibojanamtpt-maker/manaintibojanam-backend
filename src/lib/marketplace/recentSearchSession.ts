/**
 * M4 PR-7 — recent marketplace searches (browser session only).
 */

const STORAGE_KEY = 'bhos_marketplace_recent_searches';
const MAX_RECENT_SEARCHES = 8;

let memoryRecentSearches: string[] = [];

const readStorage = (): string[] => {
  if (typeof sessionStorage !== 'undefined') {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return [...memoryRecentSearches];
      }

      const parsed = JSON.parse(raw) as unknown;
      if (!Array.isArray(parsed)) {
        return [...memoryRecentSearches];
      }

      return parsed.filter(
        (entry): entry is string => typeof entry === 'string' && entry.trim().length > 0
      );
    } catch {
      return [...memoryRecentSearches];
    }
  }

  return [...memoryRecentSearches];
};

const writeStorage = (entries: readonly string[]): void => {
  memoryRecentSearches = [...entries];

  if (typeof sessionStorage === 'undefined') {
    return;
  }

  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore quota / privacy errors
  }
};

export function readRecentMarketplaceSearches(): string[] {
  return readStorage();
}

export function addRecentMarketplaceSearch(query: string): void {
  const trimmed = query.trim();
  if (!trimmed) {
    return;
  }

  const existing = readStorage().filter((entry) => entry.toLowerCase() !== trimmed.toLowerCase());
  writeStorage([trimmed, ...existing].slice(0, MAX_RECENT_SEARCHES));
}

export function clearRecentMarketplaceSearches(): void {
  writeStorage([]);
}
