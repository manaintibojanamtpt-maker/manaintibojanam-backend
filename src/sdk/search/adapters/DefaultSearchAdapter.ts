/**
 * SearchSDK — default search adapter (M4 PR-5 / PR-6).
 * Validates query, invokes SearchRepository, enriches via DiscoverySDK, maps SearchResult.
 */

import type { SdkAsyncResult } from '../../core/result';
import { isSdkSuccess, sdkError, sdkFail, sdkOk } from '../../core/resultHelpers';
import type { DiscoverySDK } from '../../discovery/contracts/DiscoverySDK';
import type { SearchSDK } from '../contracts/SearchSDK';
import type {
  AutocompleteFilter,
  SearchQuery,
  SearchResult,
  SearchSuggestion,
} from '../dto';
import { SEARCH_ERROR_MESSAGES } from '../errors/searchErrors';
import { enrichSearchWithDiscovery } from '../pipeline/SearchDiscoveryEnricher';
import { invokeSearchRepository } from '../pipeline/SearchRepositoryOrchestrator';
import { resolveSearchPipelineFlags } from '../pipeline/resolvePipelineFlags';
import { mapSearchIndexHitsToResult } from '../pipeline/SearchResultMapper';
import {
  buildSearchTiming,
  createSearchPipelineTimer,
} from '../pipeline/searchPipelineTelemetry';
import type { SearchRepository } from '../repository/SearchRepository';
import type { CreateSearchSDKOptions } from '../shared/options';
import { validateSearchQuery } from '../validation/validateSearchQuery';
import { invokeSearchAutocomplete } from '../pipeline/SearchAutocompleteOrchestrator';
import { invokeSearchSuggest } from '../pipeline/SearchSuggestOrchestrator';
import { readSearchFlagDefault } from '../core/featureFlags';
import { searchNotConfiguredAsync } from './notConfigured';

const LAYER = 'DefaultSearchAdapter';

export interface DefaultSearchAdapterDeps {
  readonly repository: SearchRepository;
  readonly repositoryEnabled: boolean;
  readonly discoverySdk: DiscoverySDK;
  readonly discoveryEnabled: boolean;
  readonly featureFlags?: CreateSearchSDKOptions['featureFlags'];
  readonly discoveryFeatureFlags?: CreateSearchSDKOptions['discoveryFeatureFlags'];
}

export class DefaultSearchAdapter implements SearchSDK {
  constructor(private readonly deps: DefaultSearchAdapterDeps) {}

  async search(query: SearchQuery): SdkAsyncResult<SearchResult> {
    const totalTimer = createSearchPipelineTimer();
    const flags = resolveSearchPipelineFlags({
      featureFlags: this.deps.featureFlags,
      discoveryFeatureFlags: this.deps.discoveryFeatureFlags,
    });

    const validated = validateSearchQuery(query);
    if (!isSdkSuccess(validated)) {
      return validated;
    }

    if (!this.deps.repositoryEnabled) {
      return sdkFail(
        sdkError('UNAVAILABLE', SEARCH_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
          searchCode: 'REPOSITORY_UNAVAILABLE',
        })
      );
    }

    const normalizeStartedAt = createSearchPipelineTimer();
    const normalizedQuery = validated.value;
    const normalizeMs = normalizeStartedAt();

    const repositoryTimer = createSearchPipelineTimer();
    const repositoryResult = await invokeSearchRepository(normalizedQuery, this.deps.repository);
    const repositoryMs = repositoryTimer();

    if (!isSdkSuccess(repositoryResult)) {
      return repositoryResult;
    }

    const enrichmentResult = await enrichSearchWithDiscovery(
      normalizedQuery,
      repositoryResult.value,
      {
        discoverySdk: this.deps.discoverySdk,
        discoveryEnabled: this.deps.discoveryEnabled,
      }
    );

    if (!isSdkSuccess(enrichmentResult)) {
      return enrichmentResult;
    }

    const timingMs = buildSearchTiming({
      normalizeMs,
      repositoryMs,
      discoveryMs: enrichmentResult.value.discoveryMs,
      filterMs: enrichmentResult.value.filterMs,
      totalMs: totalTimer(),
    });

    return sdkOk(
      mapSearchIndexHitsToResult({
        query: normalizedQuery,
        hits: repositoryResult.value,
        flags,
        timingMs,
        enrichment: enrichmentResult.value,
      })
    );
  }

  async suggest(query: SearchQuery): SdkAsyncResult<SearchSuggestion[]> {
    if (!this.isSuggestionsEnabled()) {
      return searchNotConfiguredAsync('suggest', LAYER);
    }

    if (!this.deps.repositoryEnabled) {
      return sdkFail(
        sdkError('UNAVAILABLE', SEARCH_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
          searchCode: 'REPOSITORY_UNAVAILABLE',
        })
      );
    }

    return invokeSearchSuggest(this.deps.repository, query);
  }

  async autocomplete(filter: AutocompleteFilter): SdkAsyncResult<SearchSuggestion[]> {
    if (!this.isAutocompleteEnabled()) {
      return searchNotConfiguredAsync('autocomplete', LAYER);
    }

    if (!this.deps.repositoryEnabled) {
      return sdkFail(
        sdkError('UNAVAILABLE', SEARCH_ERROR_MESSAGES.REPOSITORY_UNAVAILABLE, {
          searchCode: 'REPOSITORY_UNAVAILABLE',
        })
      );
    }

    return invokeSearchAutocomplete(this.deps.repository, filter);
  }

  private isAutocompleteEnabled(): boolean {
    const readFlag = this.deps.featureFlags ?? readSearchFlagDefault;
    return readFlag('FF_SEARCH_ENABLED') && readFlag('FF_SEARCH_AUTOCOMPLETE_ENABLED');
  }

  private isSuggestionsEnabled(): boolean {
    const readFlag = this.deps.featureFlags ?? readSearchFlagDefault;
    return readFlag('FF_SEARCH_ENABLED') && readFlag('FF_SEARCH_SUGGESTIONS_ENABLED');
  }
}

export function createDefaultSearchAdapter(deps: DefaultSearchAdapterDeps): SearchSDK {
  return new DefaultSearchAdapter(deps);
}
