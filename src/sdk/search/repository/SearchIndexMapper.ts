/**
 * SearchSDK — tenant records → SearchIndexHit mapping (M4 PR-3).
 * Uses domain match classification — no ranking orchestration.
 */

import { classifyTagOverlap, classifyTextMatch } from '../../../domain/search/matching/SearchMatchClassifier';
import { normalizeForMatch, normalizeTagToken } from '../../../domain/search/shared/SearchLanguage';
import { SEARCH_FIELD_NAMES } from '../../../domain/search/shared/SearchConstants';
import type { TenantId } from '../../core/types';
import type { BranchId } from '../../discovery/types/branded';
import type {
  AreaSearchFilter,
  CuisineSearchFilter,
  RestaurantSearchFilter,
  SearchIndexHit,
  TagSearchFilter,
} from '../dto';
import type { SearchTenantReadRecord } from './SearchTenantReadRecord';

const DEFAULT_LIMIT = 50;

const asTenantId = (id: string): TenantId => id as TenantId;
const asBranchId = (id: string): BranchId => id as BranchId;

const toIndexHit = (
  tenant: SearchTenantReadRecord,
  match: { matchType: 'exact' | 'prefix' | 'contains'; signal: number; field: string },
  snippet?: string
): SearchIndexHit => ({
  tenantId: asTenantId(tenant.id),
  branchId: asBranchId(tenant.id),
  matchType: match.matchType,
  field: match.field,
  score: match.signal,
  snippet,
});

export function sortSearchIndexHits(
  hits: readonly SearchIndexHit[],
  limit?: number
): SearchIndexHit[] {
  const sorted = [...hits].sort((left, right) => {
    if (right.score !== left.score) {
      return right.score - left.score;
    }
    return String(left.tenantId).localeCompare(String(right.tenantId));
  });

  if (!limit || limit <= 0) {
    return sorted;
  }

  return sorted.slice(0, limit);
}

const filterByTenantIds = (
  tenants: readonly SearchTenantReadRecord[],
  tenantIds?: readonly TenantId[]
): SearchTenantReadRecord[] => {
  if (!tenantIds?.length) {
    return [...tenants];
  }
  const allowed = new Set(tenantIds.map(String));
  return tenants.filter((tenant) => allowed.has(tenant.id));
};

const bestTextHit = (
  tenant: SearchTenantReadRecord,
  query: string,
  fields: ReadonlyArray<{ readonly value?: string; readonly field: string }>
): SearchIndexHit | null => {
  let best: SearchIndexHit | null = null;

  for (const entry of fields) {
    if (!entry.value?.trim()) {
      continue;
    }

    const classified = classifyTextMatch(query, entry.value, entry.field);
    if (classified.matchType === 'none') {
      continue;
    }

    const hit = toIndexHit(
      tenant,
      {
        matchType: classified.matchType as 'exact' | 'prefix' | 'contains',
        signal: classified.signal,
        field: classified.field,
      },
      entry.value
    );

    if (!best || hit.score > best.score) {
      best = hit;
    }
  }

  return best;
};

export function mapRestaurantSearchHits(
  tenants: readonly SearchTenantReadRecord[],
  filter: RestaurantSearchFilter
): SearchIndexHit[] {
  const query = filter.text?.trim();
  if (!query) {
    return [];
  }

  const scoped = filterByTenantIds(tenants, filter.tenantIds);
  const hits: SearchIndexHit[] = [];

  for (const tenant of scoped) {
    const hit = bestTextHit(tenant, query, [
      { value: tenant.name, field: SEARCH_FIELD_NAMES.RESTAURANT_NAME },
      { value: tenant.slug, field: SEARCH_FIELD_NAMES.RESTAURANT_SLUG },
      { value: tenant.description, field: 'description' },
    ]);

    if (hit) {
      hits.push(hit);
    }
  }

  return sortSearchIndexHits(hits, filter.limit ?? DEFAULT_LIMIT);
}

const matchesTagMode = (
  candidateTags: readonly string[],
  queryTags: readonly string[],
  matchMode: 'any' | 'all' = 'any'
): boolean => {
  const normalizedCandidate = new Set(candidateTags.map(normalizeTagToken).filter(Boolean));
  const normalizedQuery = queryTags.map(normalizeTagToken).filter(Boolean);

  if (normalizedQuery.length === 0) {
    return false;
  }

  if (matchMode === 'all') {
    return normalizedQuery.every((tag) => normalizedCandidate.has(tag));
  }

  return normalizedQuery.some((tag) => normalizedCandidate.has(tag));
};

export function mapCuisineSearchHits(
  tenants: readonly SearchTenantReadRecord[],
  filter: CuisineSearchFilter
): SearchIndexHit[] {
  if (!filter.tags.length) {
    return [];
  }

  const scoped = filterByTenantIds(tenants, filter.tenantIds);
  const mode = filter.matchMode ?? 'any';
  const hits: SearchIndexHit[] = [];

  for (const tenant of scoped) {
    const tags = tenant.cuisineTags ?? [];
    if (!matchesTagMode(tags, filter.tags, mode)) {
      continue;
    }

    const classified = classifyTagOverlap(filter.tags, tags, SEARCH_FIELD_NAMES.CUISINE_TAGS);
    if (classified.matchType === 'none') {
      continue;
    }

    hits.push(
      toIndexHit(
        tenant,
        {
          matchType: 'contains',
          signal: classified.signal,
          field: SEARCH_FIELD_NAMES.CUISINE_TAGS,
        },
        tags.join(', ')
      )
    );
  }

  return sortSearchIndexHits(hits, filter.limit ?? DEFAULT_LIMIT);
}

export function mapTagSearchHits(
  tenants: readonly SearchTenantReadRecord[],
  filter: TagSearchFilter
): SearchIndexHit[] {
  if (!filter.tags.length) {
    return [];
  }

  const mode = filter.matchMode ?? 'any';
  const hits: SearchIndexHit[] = [];

  for (const tenant of tenants) {
    const tags = tenant.cuisineTags ?? [];
    if (!matchesTagMode(tags, filter.tags, mode)) {
      continue;
    }

    const classified = classifyTagOverlap(filter.tags, tags, SEARCH_FIELD_NAMES.TAG);
    hits.push(
      toIndexHit(
        tenant,
        {
          matchType: 'contains',
          signal: classified.signal,
          field: SEARCH_FIELD_NAMES.TAG,
        },
        tags.join(', ')
      )
    );
  }

  return sortSearchIndexHits(hits, filter.limit ?? DEFAULT_LIMIT);
}

const matchesAreaField = (fieldValue: string | undefined, query?: string): boolean => {
  if (!query?.trim() || !fieldValue?.trim()) {
    return false;
  }
  return normalizeForMatch(fieldValue) === normalizeForMatch(query);
};

const matchesAreaContains = (fieldValue: string | undefined, query?: string): boolean => {
  if (!query?.trim() || !fieldValue?.trim()) {
    return false;
  }
  const normalizedField = normalizeForMatch(fieldValue);
  const normalizedQuery = normalizeForMatch(query);
  return normalizedField.includes(normalizedQuery);
};

export function mapAreaSearchHits(
  tenants: readonly SearchTenantReadRecord[],
  filter: AreaSearchFilter
): SearchIndexHit[] {
  const areaChecks: Array<{ query?: string; field: keyof AreaSearchFilter }> = [
    { query: filter.areaCode, field: 'areaCode' },
    { query: filter.localityName, field: 'localityName' },
    { query: filter.cityName, field: 'cityName' },
    { query: filter.pincode, field: 'pincode' },
    { query: filter.districtName, field: 'districtName' },
  ];

  const activeChecks = areaChecks.filter((check) => check.query?.trim());
  if (activeChecks.length === 0) {
    return [];
  }

  const hits: SearchIndexHit[] = [];

  for (const tenant of tenants) {
    const location = tenant.location;
    if (!location) {
      continue;
    }

    const fieldValues: Record<string, string | undefined> = {
      areaCode: location.areaCode,
      localityName: location.localityName,
      cityName: location.cityName,
      pincode: location.pincode,
      districtName: location.districtName,
    };

    let best: SearchIndexHit | null = null;

    for (const check of activeChecks) {
      const value = fieldValues[check.field];
      const query = check.query!.trim();
      const exact = matchesAreaField(value, query);
      const contains = matchesAreaContains(value, query);

      if (!exact && !contains) {
        best = null;
        break;
      }

      const classified = classifyTextMatch(query, value ?? '', check.field);
      const hit = toIndexHit(
        tenant,
        {
          matchType:
            classified.matchType === 'none'
              ? 'contains'
              : (classified.matchType as 'exact' | 'prefix' | 'contains'),
          signal: classified.matchType === 'none' ? 0.65 : classified.signal,
          field: SEARCH_FIELD_NAMES.AREA,
        },
        value
      );

      if (!best || hit.score > best.score) {
        best = hit;
      }
    }

    if (best) {
      hits.push(best);
    }
  }

  return sortSearchIndexHits(hits, filter.limit ?? DEFAULT_LIMIT);
}
