/**
 * MenuSDK — search result DTOs (M7 PR-1).
 */

import type { MenuItem } from './item';
import type { MenuCategory } from './category';

export interface MenuSearchHit {
  readonly item: MenuItem;
  readonly score: number;
  readonly matchedFields: readonly string[];
}

export interface MenuSearchResult {
  readonly hits: readonly MenuSearchHit[];
  readonly categories: readonly MenuCategory[];
  readonly totalHits: number;
  readonly queryText: string;
}
