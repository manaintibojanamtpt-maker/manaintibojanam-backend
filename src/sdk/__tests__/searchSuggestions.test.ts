import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { BranchId } from '../discovery/types/branded';
import { createDefaultSearchAdapter } from '../search/adapters/DefaultSearchAdapter';
import { createStubDiscoveryAdapter } from '../discovery/adapters/StubDiscoveryAdapter';
import { createStubSearchRepository } from '../search/repository/adapters/StubSearchRepository';
import type { SearchRepository } from '../search/repository/SearchRepository';
import type { SearchIndexHit } from '../search/dto';
import { filterCatalogByPrefix } from '../search/providers/SuggestionCatalog';
import { invokeSearchAutocomplete } from '../search/pipeline/SearchAutocompleteOrchestrator';
import { invokeSearchSuggest } from '../search/pipeline/SearchSuggestOrchestrator';

const CUSTOMER_POINT = { lat: 18.5204, lng: 73.8567 };

const SAMPLE_HIT: SearchIndexHit = {
  tenantId: 'tenant-spice' as TenantId,
  branchId: 'tenant-spice' as BranchId,
  matchType: 'prefix',
  field: 'name',
  score: 0.92,
  snippet: 'Spice Kitchen',
};

const flagsAllOn = (flag: string) =>
  flag === 'FF_SEARCH_ENABLED' ||
  flag === 'FF_SEARCH_REPOSITORY_ENABLED' ||
  flag === 'FF_SEARCH_AUTOCOMPLETE_ENABLED' ||
  flag === 'FF_SEARCH_SUGGESTIONS_ENABLED';

const flagsAutocompleteOff = (flag: string) =>
  flag === 'FF_SEARCH_ENABLED' ||
  flag === 'FF_SEARCH_REPOSITORY_ENABLED' ||
  flag === 'FF_SEARCH_SUGGESTIONS_ENABLED';

const createMockRepository = (
  overrides: Partial<SearchRepository> = {}
): SearchRepository => ({
  ...createStubSearchRepository(),
  ...overrides,
});

describe('Search suggestions orchestration (M4 PR-9)', () => {
  it('filterCatalogByPrefix matches cuisine labels', () => {
    const matches = filterCatalogByPrefix(
      [{ id: 'cuisine-biryani', label: 'Biryani', kind: 'cuisine', score: 1 }],
      'bir'
    );
    assert.equal(matches.length, 1);
    assert.equal(matches[0]?.label, 'Biryani');
  });

  it('invokeSearchAutocomplete returns empty for short prefix', async () => {
    const result = await invokeSearchAutocomplete(createMockRepository(), { prefix: 'a' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.deepEqual(result.value, []);
  });

  it('invokeSearchAutocomplete maps restaurant hits and cuisines', async () => {
    const repository = createMockRepository({
      searchRestaurants: async () => sdkOk([SAMPLE_HIT]),
    });

    const result = await invokeSearchAutocomplete(repository, { prefix: 'bir' });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.value.some((entry) => entry.label === 'Spice Kitchen'));
    assert.ok(result.value.some((entry) => entry.kind === 'cuisine'));
  });

  it('invokeSearchSuggest returns catalog when text is empty', async () => {
    const result = await invokeSearchSuggest(createMockRepository(), {
      customerPoint: CUSTOMER_POINT,
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.ok(result.value.length > 0);
    assert.ok(result.value.some((entry) => entry.kind === 'cuisine'));
  });

  it('DefaultSearchAdapter.autocomplete is gated by FF_SEARCH_AUTOCOMPLETE_ENABLED', async () => {
    const adapter = createDefaultSearchAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT]),
      }),
      repositoryEnabled: true,
      discoverySdk: createStubDiscoveryAdapter(),
      discoveryEnabled: false,
      featureFlags: flagsAutocompleteOff,
    });

    const blocked = await adapter.autocomplete({ prefix: 'spice' });
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.equal(blocked.error.code, 'NOT_CONFIGURED');

    const enabled = createDefaultSearchAdapter({
      repository: createMockRepository({
        searchRestaurants: async () => sdkOk([SAMPLE_HIT]),
      }),
      repositoryEnabled: true,
      discoverySdk: createStubDiscoveryAdapter(),
      discoveryEnabled: false,
      featureFlags: flagsAllOn,
    });

    const allowed = await enabled.autocomplete({ prefix: 'spice' });
    assert.equal(allowed.ok, true);
    if (!allowed.ok) return;
    assert.ok(allowed.value.length > 0);
  });

  it('DefaultSearchAdapter.suggest is gated by FF_SEARCH_SUGGESTIONS_ENABLED', async () => {
    const adapter = createDefaultSearchAdapter({
      repository: createMockRepository(),
      repositoryEnabled: true,
      discoverySdk: createStubDiscoveryAdapter(),
      discoveryEnabled: false,
      featureFlags: (flag) =>
        flag === 'FF_SEARCH_ENABLED' || flag === 'FF_SEARCH_REPOSITORY_ENABLED',
    });

    const blocked = await adapter.suggest({ customerPoint: CUSTOMER_POINT });
    assert.equal(blocked.ok, false);
    if (blocked.ok) return;
    assert.equal(blocked.error.code, 'NOT_CONFIGURED');
  });
});
