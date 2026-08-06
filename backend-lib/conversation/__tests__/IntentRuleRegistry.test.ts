import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IntentRuleRegistry } from '../workflow/intent/IntentRuleRegistry.js';
import type { IntentRule } from '../workflow/intent/IntentRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

describe('IntentRuleRegistry', () => {
  it('should store and sort rules by priority descending', () => {
    const registry = new IntentRuleRegistry();

    const lowPriorityRule: IntentRule = {
      name: 'LowPriority',
      priority: 10,
      matches: () => true,
      resolve: () => ({ intent: ConversationIntent.Unknown, confidence: 0, entities: [], requiresClarification: false, normalizedTranscript: '' })
    };

    const highPriorityRule: IntentRule = {
      name: 'HighPriority',
      priority: 100,
      matches: () => true,
      resolve: () => ({ intent: ConversationIntent.Unknown, confidence: 0, entities: [], requiresClarification: false, normalizedTranscript: '' })
    };

    const mediumPriorityRule: IntentRule = {
      name: 'MediumPriority',
      priority: 50,
      matches: () => true,
      resolve: () => ({ intent: ConversationIntent.Unknown, confidence: 0, entities: [], requiresClarification: false, normalizedTranscript: '' })
    };

    // Register in mixed order
    registry.register(lowPriorityRule);
    registry.register(highPriorityRule);
    registry.register(mediumPriorityRule);

    const rules = registry.getRules();
    
    assert.strictEqual(rules.length, 3);
    assert.strictEqual(rules[0].name, 'HighPriority');
    assert.strictEqual(rules[1].name, 'MediumPriority');
    assert.strictEqual(rules[2].name, 'LowPriority');
  });

  it('should ignore duplicate registrations by name', () => {
    const registry = new IntentRuleRegistry();

    const rule1: IntentRule = {
      name: 'DuplicateRule',
      priority: 10,
      matches: () => true,
      resolve: () => ({ intent: ConversationIntent.Unknown, confidence: 0, entities: [], requiresClarification: false, normalizedTranscript: '' })
    };

    const rule2: IntentRule = {
      name: 'DuplicateRule',
      priority: 100, // Even with higher priority, it should be ignored if name matches
      matches: () => true,
      resolve: () => ({ intent: ConversationIntent.Unknown, confidence: 0, entities: [], requiresClarification: false, normalizedTranscript: '' })
    };

    registry.register(rule1);
    registry.register(rule2);

    const rules = registry.getRules();
    assert.strictEqual(rules.length, 1);
    assert.strictEqual(rules[0].priority, 10);
  });
});
