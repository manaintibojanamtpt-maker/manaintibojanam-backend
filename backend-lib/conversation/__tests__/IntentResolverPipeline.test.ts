import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { IntentResolver } from '../workflow/intent/IntentResolver.js';
import { IntentRuleRegistry } from '../workflow/intent/IntentRuleRegistry.js';
import { TranscriptNormalizer } from '../workflow/intent/TranscriptNormalizer.js';

import { GreetingRule } from '../workflow/intent/rules/GreetingRule.js';
import { ConfirmationRule } from '../workflow/intent/rules/ConfirmationRule.js';
import { CancelRule } from '../workflow/intent/rules/CancelRule.js';
import { CheckoutRule } from '../workflow/intent/rules/CheckoutRule.js';
import { AddItemRule } from '../workflow/intent/rules/AddItemRule.js';
import { FallbackRule } from '../workflow/intent/rules/FallbackRule.js';

import { ConversationIntent } from '../models/ConversationIntent.js';

describe('IntentResolver Integrated Pipeline', () => {
  // 1. Setup the registry
  const registry = new IntentRuleRegistry();
  registry.register(new GreetingRule());
  registry.register(new ConfirmationRule());
  registry.register(new CancelRule());
  registry.register(new CheckoutRule());
  registry.register(new AddItemRule());
  registry.register(new FallbackRule());

  // 2. Setup the resolver and normalizer
  const resolver = new IntentResolver(registry);
  const normalizer = new TranscriptNormalizer();

  const resolveText = (text: string, entities: any[] = []) => {
    const normalized = normalizer.normalize(text);
    return resolver.resolve(normalized, undefined, entities);
  };

  it('should resolve pure greeting correctly', () => {
    const result = resolveText('Namaste');
    assert.strictEqual(result.intent, ConversationIntent.Greeting);
    assert.strictEqual(result.confidence, 1.0);
  });

  it('should resolve explicit confirmation correctly', () => {
    const result = resolveText('Haan please'); // Normalizes to "yes please"
    assert.strictEqual(result.intent, ConversationIntent.Confirmation);
    assert.strictEqual(result.entities[0].booleanValue, true);
  });

  it('should resolve cancellation correctly', () => {
    const result = resolveText('Never mind stop'); // Normalizes to "cancelorder cancelorder"
    assert.strictEqual(result.intent, ConversationIntent.Cancel);
  });

  it('should resolve checkout correctly', () => {
    const result = resolveText('Get the bill'); // Normalizes to "get the checkout"
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
  });

  it('should resolve AddItem correctly when entities are provided', () => {
    const result = resolveText('add one chicken biryani', [
      { type: 'FoodItem', rawValue: 'chicken biryani' },
      { type: 'Quantity', numericValue: 1 }
    ]);
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 1.0);
  });

  it('should fall back to Unknown for random noise', () => {
    const result = resolveText('what is the weather like today');
    assert.strictEqual(result.intent, ConversationIntent.Unknown);
    assert.strictEqual(result.requiresClarification, true);
  });

  it('should prioritize Cancel over Greeting in mixed transcripts', () => {
    const result = resolveText('Hello actually never mind'); 
    // Normalizes to "hello actually cancelorder"
    // Greeting runs (priority 10), gives low confidence.
    // Cancel runs (priority 80), gives high confidence (0.8).
    // Cancel wins.
    assert.strictEqual(result.intent, ConversationIntent.Cancel);
  });

  it('should prioritize Checkout over AddItem when combined without AddItem entities', () => {
    const result = resolveText('i want to go'); 
    // Normalizes to "i want takeaway"
    // AddItem matches verb "want", but no food entities -> 0.4 score.
    // Checkout matches "takeaway" -> 0.85 score.
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
  });
});
