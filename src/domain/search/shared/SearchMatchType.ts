/**
 * Search domain — match type identifiers (M4 PR-2).
 * Pure domain — no SDK imports.
 */

export type SearchMatchType = 'exact' | 'prefix' | 'contains' | 'facet' | 'none';

/** Base signal scores per architecture doc §6.2 */
export const SEARCH_MATCH_TYPE_SIGNALS: Readonly<Record<SearchMatchType, number>> = {
  exact: 1.0,
  prefix: 0.85,
  contains: 0.65,
  facet: 0.5,
  none: 0,
};

export function isTextMatchType(
  matchType: SearchMatchType
): matchType is 'exact' | 'prefix' | 'contains' {
  return matchType === 'exact' || matchType === 'prefix' || matchType === 'contains';
}
