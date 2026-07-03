/**
 * SearchSDK — SearchIndexHit[] → SearchResult mapping (M4 PR-5).
 * Discovery enrichment arrives in M4 PR-6.
 */

import { normalizeSearchQuery } from '../../../domain/search/normalize/QueryNormalizer';
import type { Geohash } from '../../discovery/types/branded';
import type { SearchQuery, SearchIndexHit, SearchRestaurantHit, SearchResult } from '../dto';
import type { SearchPipelineFlags, SearchTimingMs } from '../dto/results';
import { DISCOVERY_SDK_VERSION } from '../../discovery/version';
import { SEARCH_SDK_VERSION } from '../version';
import { hasStructuredSearchFilters } from '../validation/validateSearchQuery';
import { mapEnrichedCandidatesToRestaurantHits } from './SearchCandidateMapper';
import type { SearchDiscoveryEnrichment } from './types';

const DEFAULT_QUERY_RADIUS_KM = 10;

const buildAppliedFilters = (query: SearchQuery): string[] => {
  const applied: string[] = [];
  const text = query.text?.trim() || query.filters?.restaurantName?.trim();

  if (text) {
    applied.push('restaurantName');
  }
  if (query.filters?.cuisine?.tags?.length) {
    applied.push('cuisine');
  }
  if (hasStructuredSearchFilters(query.filters) && query.filters?.area) {
    applied.push('area');
  }
  if (query.filters?.tags?.tags?.length) {
    applied.push('tags');
  }
  if (query.openNow) {
    applied.push('openNow');
  }
  if (query.vegOnly) {
    applied.push('vegOnly');
  }
  if (query.minRating !== undefined) {
    applied.push('minRating');
  }
  if (query.maxDeliveryMins !== undefined) {
    applied.push('maxDeliveryMins');
  }
  if (query.maxDistanceKm !== undefined) {
    applied.push('maxDistanceKm');
  }

  return applied;
};

const mapHitToMatchExplanation = (
  hit: SearchIndexHit,
  rank: number
): SearchRestaurantHit['match'] => ({
  score: hit.score,
  rank,
  factors: [
    {
      matchType: hit.matchType,
      field: hit.field,
      signal: hit.score,
      weight: 1,
      contribution: hit.score,
      label: `${hit.matchType} on ${hit.field}`,
    },
  ],
});

const mapHitToRestaurantHit = (
  hit: SearchIndexHit,
  query: SearchQuery,
  rank: number
): SearchRestaurantHit => ({
  restaurant: {
    tenantId: hit.tenantId,
    branchId: hit.branchId,
    name: hit.snippet?.trim() || String(hit.tenantId),
    slug: '',
    point: query.customerPoint,
    distanceKm: 0,
    geohash: (query.customerGeohash ?? '') as Geohash,
    eligibility: {
      status: 'unavailable',
      isServiceable: false,
      distanceKm: 0,
      reason: 'Discovery enrichment pending (M4 PR-6)',
    },
    isOpen: false,
  },
  match: mapHitToMatchExplanation(hit, rank),
  highlights: hit.snippet
    ? [
        {
          field: hit.field,
          snippet: hit.snippet,
        },
      ]
    : undefined,
});

const buildNormalizedQuery = (query: SearchQuery): SearchResult['query'] => {
  const text = query.text?.trim() || query.filters?.restaurantName?.trim();
  if (!text) {
    return {
      tokens: [],
      text: undefined,
      inferredCuisine: query.filters?.cuisine?.tags,
    };
  }

  const normalized = normalizeSearchQuery({ text });
  if (!normalized.ok) {
    return {
      tokens: [],
      text,
      inferredCuisine: query.filters?.cuisine?.tags,
    };
  }

  return {
    tokens: normalized.query.tokens,
    text: normalized.query.normalizedText || text,
    inferredCuisine:
      query.filters?.cuisine?.tags?.length
        ? [...query.filters.cuisine.tags]
        : normalized.query.inferredCuisineTags,
    inferredArea: query.filters?.area,
  };
};

export function mapSearchIndexHitsToResult(input: {
  readonly query: SearchQuery;
  readonly hits: readonly SearchIndexHit[];
  readonly flags: SearchPipelineFlags;
  readonly timingMs?: SearchTimingMs;
  readonly enrichment?: SearchDiscoveryEnrichment;
}): SearchResult {
  const normalized = buildNormalizedQuery(input.query);
  const appliedFilters = buildAppliedFilters(input.query);

  if (input.enrichment?.enrichmentApplied) {
    const restaurants = mapEnrichedCandidatesToRestaurantHits(input.enrichment.pairs, input.query);

    return {
      restaurants,
      totalMatches: restaurants.length,
      totalDiscoveryCandidates: input.enrichment.discovery.totalCandidates,
      query: normalized,
      metadata: {
        normalizedText: normalized.text,
        appliedFilters,
        discoveryQueryRadiusKm:
          input.enrichment.discovery.queryRadiusKm ?? input.query.radiusKm ?? DEFAULT_QUERY_RADIUS_KM,
        searchSdkVersion: SEARCH_SDK_VERSION,
        discoverySdkVersion: DISCOVERY_SDK_VERSION,
        correlationId: input.enrichment.correlationId,
        discoveryEnrichmentEnabled: true,
        timingMs: input.timingMs,
        flags: {
          ...input.flags,
          discoveryEnabled: true,
        },
      },
      searchedAt: Date.now(),
    };
  }

  const restaurants = input.hits.map((hit, index) =>
    mapHitToRestaurantHit(hit, input.query, index + 1)
  );

  return {
    restaurants,
    totalMatches: restaurants.length,
    totalDiscoveryCandidates: input.enrichment?.discovery.totalCandidates ?? 0,
    query: normalized,
    metadata: {
      normalizedText: normalized.text,
      appliedFilters,
      discoveryQueryRadiusKm: input.query.radiusKm ?? DEFAULT_QUERY_RADIUS_KM,
      searchSdkVersion: SEARCH_SDK_VERSION,
      discoverySdkVersion: input.enrichment?.enrichmentApplied ? DISCOVERY_SDK_VERSION : undefined,
      correlationId: input.enrichment?.correlationId,
      discoveryEnrichmentEnabled: input.enrichment?.enrichmentApplied ?? false,
      discoveryEnrichmentFallbackReason: input.enrichment?.fallbackReason,
      timingMs: input.timingMs,
      flags: input.flags,
    },
    searchedAt: Date.now(),
  };
}
