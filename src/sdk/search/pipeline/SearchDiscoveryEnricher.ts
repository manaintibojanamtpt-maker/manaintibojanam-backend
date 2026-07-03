/**
 * SearchSDK — Discovery enrichment orchestrator (M4 PR-6).
 * Search consumes Discovery — Discovery never consumes Search.
 */

import type { SdkAsyncResult } from '../../core/result';
import { isSdkSuccess, sdkOk } from '../../core/resultHelpers';
import type { DiscoverySDK } from '../../discovery/contracts/DiscoverySDK';
import type { SearchQuery, SearchIndexHit } from '../dto';
import { SEARCH_ERROR_MESSAGES } from '../errors/searchErrors';
import { buildDiscoveryQueryFromSearch } from './buildDiscoveryQuery';
import { intersectSearchHitsWithDiscovery } from './DiscoveryIntersection';
import { createSearchPipelineTimer } from './searchPipelineTelemetry';
import type { SearchDiscoveryEnrichment } from './types';
import { EMPTY_DISCOVERY_RESULT } from './types';

const createCorrelationId = (): string =>
  `search-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export interface SearchDiscoveryEnricherDeps {
  readonly discoverySdk: DiscoverySDK;
  readonly discoveryEnabled: boolean;
  readonly correlationIdFactory?: () => string;
}

export async function enrichSearchWithDiscovery(
  query: SearchQuery,
  hits: readonly SearchIndexHit[],
  deps: SearchDiscoveryEnricherDeps
): SdkAsyncResult<SearchDiscoveryEnrichment> {
  const correlationId = deps.correlationIdFactory?.() ?? createCorrelationId();

  if (hits.length === 0) {
    return sdkOk({
      pairs: [],
      discovery: EMPTY_DISCOVERY_RESULT,
      correlationId,
      discoveryMs: 0,
      filterMs: 0,
      enrichmentApplied: false,
    });
  }

  if (!deps.discoveryEnabled) {
    return sdkOk({
      pairs: [],
      discovery: EMPTY_DISCOVERY_RESULT,
      correlationId,
      discoveryMs: 0,
      filterMs: 0,
      enrichmentApplied: false,
      fallbackReason: 'FF_DISCOVERY_ENABLED is off',
    });
  }

  const discoveryTimer = createSearchPipelineTimer();
  const discoveryQuery = buildDiscoveryQueryFromSearch(query);
  const discoveryResult = await deps.discoverySdk.discoverNearby(discoveryQuery);
  const discoveryMs = discoveryTimer();

  if (!isSdkSuccess(discoveryResult)) {
    return sdkOk({
      pairs: [],
      discovery: EMPTY_DISCOVERY_RESULT,
      correlationId,
      discoveryMs,
      filterMs: 0,
      enrichmentApplied: false,
      fallbackReason:
        discoveryResult.error.code === 'NOT_CONFIGURED'
          ? SEARCH_ERROR_MESSAGES.DISCOVERY_UNAVAILABLE
          : discoveryResult.error.message,
    });
  }

  const filterTimer = createSearchPipelineTimer();
  const pairs = intersectSearchHitsWithDiscovery(hits, discoveryResult.value);
  const filterMs = filterTimer();

  return sdkOk({
    pairs,
    discovery: discoveryResult.value,
    correlationId,
    discoveryMs,
    filterMs,
    enrichmentApplied: true,
  });
}
