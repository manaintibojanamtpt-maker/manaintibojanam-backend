/**
 * SearchSDK — SearchRepository invocation (M4 PR-5).
 * No Firestore, no Discovery pipeline.
 */

import type { SdkAsyncResult } from '../../core/result';
import { sdkOk } from '../../core/resultHelpers';
import type { SearchQuery, SearchIndexHit } from '../dto';
import type { SearchRepository } from '../repository/SearchRepository';
import { sortSearchIndexHits } from '../repository/SearchIndexMapper';
import { mapRepositoryError } from './mapRepositoryError';

const mergeSearchHits = (
  groups: readonly SearchIndexHit[][],
  limit?: number
): SearchIndexHit[] => {
  if (groups.length === 0) {
    return [];
  }

  if (groups.length === 1) {
    return sortSearchIndexHits(groups[0] ?? [], limit);
  }

  const intersection = groups.reduce<Set<string> | null>((acc, group) => {
    const tenantIds = new Set(group.map((hit) => String(hit.tenantId)));
    if (!acc) {
      return tenantIds;
    }
    return new Set([...acc].filter((tenantId) => tenantIds.has(tenantId)));
  }, null);

  if (!intersection || intersection.size === 0) {
    return [];
  }

  const bestByTenant = new Map<string, SearchIndexHit>();
  for (const group of groups) {
    for (const hit of group) {
      const tenantId = String(hit.tenantId);
      if (!intersection.has(tenantId)) {
        continue;
      }

      const existing = bestByTenant.get(tenantId);
      if (!existing || hit.score > existing.score) {
        bestByTenant.set(tenantId, hit);
      }
    }
  }

  return sortSearchIndexHits([...bestByTenant.values()], limit);
};

const resolveSearchText = (query: SearchQuery): string | undefined =>
  query.text?.trim() || query.filters?.restaurantName?.trim() || undefined;

const hasAreaFilter = (query: SearchQuery): boolean => {
  const area = query.filters?.area;
  if (!area) {
    return false;
  }

  return Boolean(
    area.areaCode?.trim() ||
      area.localityName?.trim() ||
      area.cityName?.trim() ||
      area.pincode?.trim() ||
      area.districtName?.trim()
  );
};

export async function invokeSearchRepository(
  query: SearchQuery,
  repository: SearchRepository
): SdkAsyncResult<readonly SearchIndexHit[]> {
  const limit = query.limit;
  const tasks: Array<SdkAsyncResult<SearchIndexHit[]>> = [];

  const text = resolveSearchText(query);
  if (text) {
    tasks.push(repository.searchRestaurants({ text, limit }));
  }

  const cuisine = query.filters?.cuisine;
  if (cuisine?.tags?.length) {
    tasks.push(
      repository.searchCuisine({
        tags: cuisine.tags,
        matchMode: cuisine.matchMode ?? 'any',
        limit,
      })
    );
  }

  if (hasAreaFilter(query)) {
    tasks.push(
      repository.searchArea({
        ...query.filters!.area,
        limit,
      })
    );
  }

  const tags = query.filters?.tags;
  if (tags?.tags?.length) {
    tasks.push(
      repository.searchTags({
        tags: tags.tags,
        matchMode: tags.matchMode ?? 'any',
        limit,
      })
    );
  }

  if (tasks.length === 0) {
    return sdkOk([]);
  }

  const results = await Promise.all(tasks);
  const hitGroups: SearchIndexHit[][] = [];

  for (const result of results) {
    if (result.ok === false) {
      return mapRepositoryError(result.error);
    }
    hitGroups.push(result.value);
  }

  return sdkOk(mergeSearchHits(hitGroups, limit));
}
