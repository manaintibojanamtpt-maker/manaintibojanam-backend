import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { evaluateSearchFacets, evaluateTagFilter } from '../filters/SearchFilterEvaluator';
import { classifyRestaurantNameMatch, classifyTextMatch } from '../matching/SearchMatchClassifier';
import { normalizeSearchQuery } from '../normalize/QueryNormalizer';
import { tokenizeSearchText } from '../normalize/SearchTokenizer';
import {
  computeSearchScore,
  buildSearchRankingSignals,
  normalizeDistanceSignal,
} from '../ranking/SearchScore';
import { validateSearchWeights, SEARCH_DOMAIN_WEIGHTS } from '../ranking/SearchWeights';
import { normalizeForMatch } from '../shared/SearchLanguage';
import { validateRawSearchQuery, hasSearchIntent } from '../shared/SearchValidation';
import { SEARCH_MATCH_TYPE_SIGNALS } from '../shared/SearchMatchType';

describe('SearchTokenizer (M4 PR-2)', () => {
  it('tokenizes and removes stop words deterministically', () => {
    const tokens = tokenizeSearchText('Biryani near me in Pune');
    assert.deepEqual(tokens, ['biryani', 'pune']);
  });
});

describe('QueryNormalizer (M4 PR-2)', () => {
  it('normalizes text and infers cuisine tags', () => {
    const outcome = normalizeSearchQuery({ text: 'South Indian Biryani' });
    assert.equal(outcome.ok, true);
    if (!outcome.ok) return;
    assert.equal(outcome.query.normalizedText, 'south indian biryani');
    assert.ok(outcome.query.inferredCuisineTags.includes('south-indian'));
    assert.ok(outcome.query.inferredCuisineTags.includes('biryani'));
  });

  it('rejects queries that exceed max length', () => {
    const outcome = normalizeSearchQuery({ text: 'x'.repeat(300) });
    assert.equal(outcome.ok, false);
  });
});

describe('SearchLanguage (M4 PR-2)', () => {
  it('normalizes diacritics and case', () => {
    assert.equal(normalizeForMatch('  Café  '), 'cafe');
  });
});

describe('SearchMatchClassifier (M4 PR-2)', () => {
  it('classifies exact, prefix, and contains matches', () => {
    assert.equal(classifyTextMatch('meghana', 'Meghana Foods', 'name').matchType, 'prefix');
    assert.equal(classifyTextMatch('meghana foods', 'Meghana Foods', 'name').matchType, 'exact');
    assert.equal(classifyTextMatch('ghana', 'Meghana Foods', 'name').matchType, 'contains');
    assert.equal(classifyTextMatch('xyz', 'Meghana Foods', 'name').matchType, 'none');
  });

  it('classifies restaurant name using full query then tokens', () => {
    const match = classifyRestaurantNameMatch('meghana', ['meghana'], 'Meghana Foods');
    assert.equal(match.matchType, 'prefix');
    assert.equal(match.signal, SEARCH_MATCH_TYPE_SIGNALS.prefix);
  });
});

describe('SearchFilterEvaluator (M4 PR-2)', () => {
  it('passes open now facet when kitchen is open', () => {
    const result = evaluateSearchFacets(
      { isOpen: true, rating: 4.5, distanceKm: 2, etaMins: 30 },
      { openNow: true, minRating: 4 }
    );
    assert.equal(result.passed, true);
    assert.ok(result.appliedFacets.includes('openNow'));
    assert.ok(result.appliedFacets.includes('minRating'));
  });

  it('fails when ETA exceeds max delivery minutes', () => {
    const result = evaluateSearchFacets(
      { isOpen: true, etaMins: 50 },
      { maxDeliveryMins: 35 }
    );
    assert.equal(result.passed, false);
    assert.equal(result.failedFacet, 'maxDeliveryMins');
  });

  it('evaluates tag filters with any/all modes', () => {
    const any = evaluateTagFilter(
      { tags: ['biryani', 'north-indian'] },
      { tags: ['biryani'], matchMode: 'any' }
    );
    assert.equal(any.passed, true);

    const allFail = evaluateTagFilter(
      { tags: ['biryani'] },
      { tags: ['biryani', 'veg'], matchMode: 'all' }
    );
    assert.equal(allFail.passed, false);
  });
});

describe('SearchScore (M4 PR-2)', () => {
  it('validates domain weights sum to 1.0', () => {
    assert.equal(validateSearchWeights(), true);
    assert.equal(
      Object.values(SEARCH_DOMAIN_WEIGHTS).reduce((sum, weight) => sum + weight, 0),
      1
    );
  });

  it('computes deterministic composite score with explainable factors', () => {
    const signals = buildSearchRankingSignals({
      matchType: 'exact',
      rating: 5,
      distanceKm: 2,
      discoveryRankScore: 0.8,
    });
    const result = computeSearchScore(signals);
    assert.ok(result.score > 0);
    assert.equal(result.factors.length, 6);
    assert.equal(result.factors[0].factor, 'exactMatch');
  });

  it('normalizes distance signal inversely to proximity', () => {
    assert.ok(normalizeDistanceSignal(1) > normalizeDistanceSignal(10));
    assert.equal(normalizeDistanceSignal(20), 0);
  });
});

describe('SearchValidation (M4 PR-2)', () => {
  it('detects search intent from text or facets', () => {
    assert.equal(hasSearchIntent({ text: 'biryani' }), true);
    assert.equal(hasSearchIntent({}, { openNow: true }), true);
    assert.equal(hasSearchIntent({}), false);
  });

  it('validates acceptable raw query', () => {
    assert.equal(validateRawSearchQuery({ text: 'pizza' }).valid, true);
  });
});
