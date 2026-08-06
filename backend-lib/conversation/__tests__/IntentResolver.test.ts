import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IntentResolver } from '../workflow/intent/IntentResolver.js';
import { IntentRuleRegistry } from '../workflow/intent/IntentRuleRegistry.js';
import type { IntentRule } from '../workflow/intent/IntentRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

describe('IntentResolver', () => {
  it('should resolve intent using the highest priority and highest confidence match', () => {
    const registry = new IntentRuleRegistry();
    
    // Low priority, high confidence
    const rule1: IntentRule = {
      name: 'Rule1',
      priority: 10,
      matches: () => true,
      resolve: (t) => ({ intent: ConversationIntent.Greeting, confidence: 0.9, entities: [], requiresClarification: false, normalizedTranscript: t })
    };

    // High priority, medium confidence (should win since confidence > 0.5 and evaluated first? No, we evaluate all matching rules unless one returns >= 0.8)
    const rule2: IntentRule = {
      name: 'Rule2',
      priority: 100,
      matches: () => true,
      resolve: (t) => ({ intent: ConversationIntent.Checkout, confidence: 0.7, entities: [], requiresClarification: false, normalizedTranscript: t })
    };

    registry.register(rule1);
    registry.register(rule2);

    const resolver = new IntentResolver(registry);
    const result = resolver.resolve('hello');

    // Rule2 runs first (confidence 0.7), doesn't early exit because 0.7 < 0.8.
    // Rule1 runs next, confidence 0.9. 0.9 > 0.7, so Rule1 wins.
    assert.strictEqual(result.intent, ConversationIntent.Greeting);
    assert.strictEqual(result.confidence, 0.9);
  });

  it('should early exit if a high priority rule returns confidence >= 0.8', () => {
    const registry = new IntentRuleRegistry();
    
    // Low priority, high confidence
    const rule1: IntentRule = {
      name: 'Rule1',
      priority: 10,
      matches: () => true,
      resolve: (t) => ({ intent: ConversationIntent.Greeting, confidence: 1.0, entities: [], requiresClarification: false, normalizedTranscript: t })
    };

    // High priority, high confidence
    const rule2: IntentRule = {
      name: 'Rule2',
      priority: 100,
      matches: () => true,
      resolve: (t) => ({ intent: ConversationIntent.Checkout, confidence: 0.85, entities: [], requiresClarification: false, normalizedTranscript: t })
    };

    registry.register(rule1);
    registry.register(rule2);

    const resolver = new IntentResolver(registry);
    const result = resolver.resolve('hello');

    // Rule2 runs first (confidence 0.85). Since 0.85 >= 0.8, it breaks immediately.
    // Rule1 (confidence 1.0) is never evaluated.
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
    assert.strictEqual(result.confidence, 0.85);
  });

  it('should force requiresClarification if winning rule confidence < 0.5', () => {
    const registry = new IntentRuleRegistry();
    
    const rule: IntentRule = {
      name: 'WeakRule',
      priority: 10,
      matches: () => true,
      resolve: (t) => ({ intent: ConversationIntent.AddItem, confidence: 0.4, entities: [], requiresClarification: false, normalizedTranscript: t })
    };

    registry.register(rule);

    const resolver = new IntentResolver(registry);
    const result = resolver.resolve('some ambiguous text');

    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 0.4);
    assert.strictEqual(result.requiresClarification, true); // Forced to true by resolver
  });

  it('should throw an error if no rule matches', () => {
    const registry = new IntentRuleRegistry();
    const resolver = new IntentResolver(registry);
    
    assert.throws(() => {
      resolver.resolve('text');
    }, /No rule resolved the transcript/);
  });

  it('should pass pre-extracted entities to the rule context', () => {
    const registry = new IntentRuleRegistry();
    
    const rule: IntentRule = {
      name: 'EntityCheckingRule',
      priority: 10,
      matches: () => true,
      resolve: (t, ctx: any) => {
        // Assert that entities are passed through correctly
        assert.ok(ctx.entities);
        assert.strictEqual(ctx.entities.length, 1);
        assert.strictEqual(ctx.entities[0].type, 'FoodItem');
        
        return { intent: ConversationIntent.AddItem, confidence: 0.9, entities: ctx.entities, requiresClarification: false, normalizedTranscript: t };
      }
    };

    registry.register(rule);

    const resolver = new IntentResolver(registry);
    const result = resolver.resolve('text', undefined, [{ type: 'FoodItem', rawValue: 'Biryani' }]);

    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.entities.length, 1);
  });

  it('should prefer Unknown when multiple rules return identical 0.0 confidence', () => {
    const registry = new IntentRuleRegistry();

    const zeroGreeting: IntentRule = {
      name: 'ZeroGreeting',
      priority: 50,
      matches: () => true,
      resolve: (t) => ({
        intent: ConversationIntent.Greeting,
        confidence: 0,
        entities: [],
        requiresClarification: true,
        normalizedTranscript: t,
      }),
    };

    const fallback: IntentRule = {
      name: 'Fallback',
      priority: 0,
      matches: () => true,
      resolve: (t) => ({
        intent: ConversationIntent.Unknown,
        confidence: 0,
        entities: [],
        requiresClarification: true,
        clarificationReason: 'NoMatchingIntent',
        normalizedTranscript: t,
      }),
    };

    // Higher priority zero-confidence rule is evaluated first; without the
    // Unknown tie-break it would incorrectly win over Fallback.
    registry.register(zeroGreeting);
    registry.register(fallback);

    const resolver = new IntentResolver(registry);
    const result = resolver.resolve('noise that no rule understands');

    assert.strictEqual(result.intent, ConversationIntent.Unknown);
    assert.strictEqual(result.confidence, 0);
    assert.strictEqual(result.requiresClarification, true);
  });
});
