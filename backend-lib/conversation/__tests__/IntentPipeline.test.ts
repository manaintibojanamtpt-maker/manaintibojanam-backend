import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  IntentPipeline,
  createDefaultIntentPipeline,
} from '../workflow/intent/IntentPipeline.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

const SAMPLE_MENU = [
  { id: 'item_cb', name: 'Chicken Biryani', aliases: ['cb'] },
  { id: 'item_dosa', name: 'Masala Dosa', aliases: ['dosa'] },
] as const;

describe('IntentPipeline', () => {
  const pipeline = createDefaultIntentPipeline({ menu: SAMPLE_MENU });

  it('resolves greeting end-to-end from raw transcript', () => {
    const result = pipeline.run({ rawTranscript: 'Namaste!' });
    assert.strictEqual(result.intent, ConversationIntent.Greeting);
    assert.strictEqual(result.normalizedTranscript, 'namaste');
    assert.strictEqual(result.confidence, 1.0);
  });

  it('resolves AddItem when menu + quantity are present', () => {
    const result = pipeline.run({ rawTranscript: 'Please add 2 Chicken Biryani' });
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 1.0);
    assert.ok(
      result.extractedEntities.some(
        (e) => e.type === 'FoodItem' && e.menuItemId === 'item_cb',
      ),
    );
    assert.ok(
      result.extractedEntities.some(
        (e) => e.type === 'Quantity' && e.numericValue === 2,
      ),
    );
  });

  it('resolves Cancel over Greeting on mixed cancel phrasing', () => {
    const result = pipeline.run({ rawTranscript: 'Hello actually never mind' });
    assert.strictEqual(result.intent, ConversationIntent.Cancel);
  });

  it('falls back to Unknown for unrelated noise', () => {
    const result = pipeline.run({ rawTranscript: 'what is the weather like today' });
    assert.strictEqual(result.intent, ConversationIntent.Unknown);
    assert.strictEqual(result.requiresClarification, true);
  });

  it('does not match food when menu catalog is empty', () => {
    const emptyMenuPipeline = createDefaultIntentPipeline({ menu: [] });
    const result = emptyMenuPipeline.run({ rawTranscript: 'add two chicken biryani' });
    // Verb present but no FoodItem entity → AddItem weak / clarification, not 1.0
    assert.notEqual(result.confidence, 1.0);
    assert.ok(result.extractedEntities.every((e) => e.type !== 'FoodItem'));
  });
});

describe('createDefaultIntentPipeline', () => {
  it('returns an IntentPipeline instance', () => {
    const pipeline = createDefaultIntentPipeline();
    assert.ok(pipeline instanceof IntentPipeline);
  });
});
