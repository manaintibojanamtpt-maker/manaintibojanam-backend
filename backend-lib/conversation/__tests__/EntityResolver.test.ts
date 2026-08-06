import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { EntityResolver } from '../workflow/intent/EntityResolver.js';
import { RegexQuantityExtractor } from '../workflow/intent/extractors/RegexQuantityExtractor.js';
import type { IEntityExtractor } from '../workflow/intent/IEntityExtractor.js';
import type { ConversationEntity } from '../models/ConversationEntity.js';

describe('RegexQuantityExtractor', () => {
  const extractor = new RegexQuantityExtractor();

  it('extracts digit quantities', () => {
    const entities = extractor.extract('add 2 chicken biryani');
    assert.strictEqual(entities.length, 1);
    assert.strictEqual(entities[0].type, 'Quantity');
    assert.strictEqual(entities[0].numericValue, 2);
    assert.strictEqual(entities[0].rawValue, '2');
  });

  it('extracts word quantities', () => {
    const entities = extractor.extract('give me three dosas');
    assert.strictEqual(entities.length, 1);
    assert.strictEqual(entities[0].numericValue, 3);
    assert.strictEqual(entities[0].normalizedValue, '3');
  });

  it('returns empty for transcripts without quantities', () => {
    assert.deepEqual(extractor.extract('hello there'), []);
  });
});

describe('EntityResolver', () => {
  it('merges extractor output in registration order', () => {
    const foodStub: IEntityExtractor = {
      name: 'FoodStub',
      extract: (): ConversationEntity[] => [
        { type: 'FoodItem', rawValue: 'biryani', confidence: 0.7 },
      ],
    };

    const resolver = new EntityResolver([new RegexQuantityExtractor(), foodStub]);
    const entities = resolver.extract('add two biryani');

    assert.strictEqual(entities.length, 2);
    assert.strictEqual(entities[0].type, 'Quantity');
    assert.strictEqual(entities[1].type, 'FoodItem');
  });

  it('dedupes identical type+rawValue+span entities', () => {
    const dupQuantity: IEntityExtractor = {
      name: 'DupQuantity',
      extract: (): ConversationEntity[] => [
        {
          type: 'Quantity',
          rawValue: '2',
          numericValue: 2,
          startIndex: 4,
          endIndex: 5,
        },
      ],
    };

    const resolver = new EntityResolver([new RegexQuantityExtractor(), dupQuantity]);
    // "add 2 x" -> digit extractor finds "2" at index 4
    const entities = resolver.extract('add 2 x');
    const quantities = entities.filter((e) => e.type === 'Quantity');
    assert.strictEqual(quantities.length, 1);
  });

  it('returns empty array for blank transcript', () => {
    const resolver = new EntityResolver([new RegexQuantityExtractor()]);
    assert.deepEqual(resolver.extract('   '), []);
  });
});
