import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import {
  buildSearchCollections,
  buildSearchPlatformResponse,
  buildSearchSuggestions,
  buildSearchTrending,
} from '../src/marketplace-api/mocks/searchMockLogic';
import {
  InMemorySearchAnalytics,
  setSearchAnalyticsSink,
  trackSearchEvent,
} from '../src/features/search/analytics/searchAnalytics';
import { executeSearch } from '../src/features/search/engine/searchPlatform';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M4 search mock logic', () => {
  it('returns composable result sections for biryani query', () => {
    const response = buildSearchPlatformResponse({
      q: 'biryani',
      lat: 17.44,
      lng: 78.35,
    });
    assert.ok(response.sections.length >= 2);
    assert.ok(response.meta.totalResults > 0);
    assert.equal(response.query, 'biryani');
  });

  it('returns suggestions for partial query', () => {
    const suggestions = buildSearchSuggestions('dos');
    assert.ok(suggestions.suggestions.length > 0);
  });

  it('returns browse collections for zero state', () => {
    const collections = buildSearchCollections();
    assert.ok(collections.sections.length >= 10);
    assert.ok(collections.sections.some((s) => s.id === 'popular-categories'));
  });

  it('returns trending and popular terms', () => {
    const trending = buildSearchTrending();
    assert.ok(trending.trending.length >= 3);
    assert.ok(trending.popular.length >= 3);
  });
});

describe('M4 search analytics', () => {
  it('records events in memory sink', () => {
    const sink = new InMemorySearchAnalytics();
    setSearchAnalyticsSink(sink);
    trackSearchEvent('search_submit', { query: 'biryani' });
    assert.equal(sink.events.length, 1);
    assert.equal(sink.events[0]?.type, 'search_submit');
  });
});

describe('M4 search module structure', () => {
  const requiredFiles = [
    'src/features/search/engine/searchPlatform.ts',
    'src/features/search/infrastructure/searchApiClient.ts',
    'src/features/search/ui/SearchExperience.tsx',
    'src/types/marketplace-search.ts',
    'src/styles/experience-search.css',
    'scripts/gate-m4.mjs',
  ];

  for (const file of requiredFiles) {
    it(`includes ${file}`, () => {
      statSync(join(root, file));
    });
  }

  it('loads search CSS from main entry', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /experience-search\.css/);
  });

  it('wires search behind feature flag', () => {
    const page = readFileSync(
      join(root, 'src/features/experience/ui/search/SearchExperiencePage.tsx'),
      'utf8',
    );
    assert.match(page, /useSearchFeatureEnabled/);
    assert.match(page, /SearchExperience/);
    assert.doesNotMatch(page, /getMarketplaceApiClient/);
  });

  it('search flag defaults OFF', () => {
    const flags = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
    assert.match(flags, /FF_OB_SEARCH: false/);
  });

  it('MSW handlers expose search platform endpoints', () => {
    const handlers = readFileSync(join(root, 'src/marketplace-api/mocks/handlers.ts'), 'utf8');
    assert.match(handlers, /search\/suggestions/);
    assert.match(handlers, /search\/trending/);
    assert.match(handlers, /search\/recent/);
    assert.match(handlers, /search\/collections/);
  });

  it('marketplace client exposes search platform methods', () => {
    const client = readFileSync(join(root, 'src/marketplace-api/index.ts'), 'utf8');
    assert.match(client, /searchPlatform/);
    assert.match(client, /searchSuggestions/);
    assert.match(client, /searchCollections/);
  });

  it('search module does not import menu or checkout', () => {
    const engine = readFileSync(
      join(root, 'src/features/search/engine/searchPlatform.ts'),
      'utf8',
    );
    assert.doesNotMatch(engine, /getMenu/);
    assert.doesNotMatch(engine, /checkout/);
  });

  it('search CSS includes safe-area and reduced motion', () => {
    const css = readFileSync(join(root, 'src/styles/experience-search.css'), 'utf8');
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /prefers-reduced-motion/);
  });

  it('supports all required result types in schema', async () => {
    const types = readFileSync(join(root, 'src/types/marketplace-search.ts'), 'utf8');
    for (const type of ['restaurant', 'food', 'category', 'collection', 'offer', 'cloud_kitchen', 'brand']) {
      assert.match(types, new RegExp(`'${type}'`));
    }
  });
});

describe('M4 search platform engine', () => {
  it('exports executeSearch orchestrator', () => {
    assert.equal(typeof executeSearch, 'function');
  });
});
