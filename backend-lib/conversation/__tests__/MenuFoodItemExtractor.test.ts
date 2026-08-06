import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { MenuFoodItemExtractor } from '../workflow/intent/extractors/MenuFoodItemExtractor.js';
import { RegexQuantityExtractor } from '../workflow/intent/extractors/RegexQuantityExtractor.js';
import { EntityResolver } from '../workflow/intent/EntityResolver.js';
import { IntentResolver } from '../workflow/intent/IntentResolver.js';
import { IntentRuleRegistry } from '../workflow/intent/IntentRuleRegistry.js';
import { AddItemRule } from '../workflow/intent/rules/AddItemRule.js';
import { FallbackRule } from '../workflow/intent/rules/FallbackRule.js';
import { TranscriptNormalizer } from '../workflow/intent/TranscriptNormalizer.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

const SAMPLE_MENU = [
  { id: 'item_cb', name: 'Chicken Biryani', aliases: ['cb'] },
  { id: 'item_biryani', name: 'Biryani' },
  { id: 'item_dosa', name: 'Masala Dosa', aliases: ['dosa'] },
] as const;

describe('MenuFoodItemExtractor', () => {
  const extractor = new MenuFoodItemExtractor(SAMPLE_MENU);

  it('matches multi-word menu names with menuItemId', () => {
    const entities = extractor.extract('add one chicken biryani please');
    assert.strictEqual(entities.length, 1);
    assert.strictEqual(entities[0].type, 'FoodItem');
    assert.strictEqual(entities[0].menuItemId, 'item_cb');
    assert.strictEqual(entities[0].normalizedValue, 'Chicken Biryani');
    assert.strictEqual(entities[0].confidence, 1.0);
    assert.ok((entities[0].startIndex ?? -1) >= 0);
  });

  it('prefers longest match over shorter overlapping catalog names', () => {
    const entities = extractor.extract('chicken biryani');
    assert.strictEqual(entities.length, 1);
    assert.strictEqual(entities[0].menuItemId, 'item_cb');
  });

  it('matches aliases at slightly lower confidence', () => {
    const entities = extractor.extract('i want dosa');
    assert.strictEqual(entities.length, 1);
    assert.strictEqual(entities[0].menuItemId, 'item_dosa');
    assert.strictEqual(entities[0].confidence, 0.9);
  });

  it('returns empty when no menu phrase is present', () => {
    assert.deepEqual(extractor.extract('what is the weather'), []);
  });

  it('can extract multiple non-overlapping items', () => {
    const entities = extractor.extract('chicken biryani and masala dosa');
    assert.strictEqual(entities.length, 2);
    assert.strictEqual(entities[0].menuItemId, 'item_cb');
    assert.strictEqual(entities[1].menuItemId, 'item_dosa');
  });
});

describe('MenuFoodItemExtractor + EntityResolver composition', () => {
  it('elevates AddItem to 1.0 when quantity + food are extracted', () => {
    const entityResolver = new EntityResolver([
      new RegexQuantityExtractor(),
      new MenuFoodItemExtractor(SAMPLE_MENU),
    ]);
    const normalizer = new TranscriptNormalizer();
    const normalized = normalizer.normalize('add two chicken biryani');
    const entities = entityResolver.extract(normalized);

    assert.ok(entities.some((e) => e.type === 'Quantity' && e.numericValue === 2));
    assert.ok(entities.some((e) => e.type === 'FoodItem' && e.menuItemId === 'item_cb'));

    const registry = new IntentRuleRegistry();
    registry.register(new AddItemRule());
    registry.register(new FallbackRule());
    const intentResolver = new IntentResolver(registry);
    const result = intentResolver.resolve(normalized, undefined, entities);

    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 1.0);
  });
});
