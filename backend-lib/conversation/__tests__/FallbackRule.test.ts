import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { FallbackRule } from '../workflow/intent/rules/FallbackRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

describe('FallbackRule', () => {
  const rule = new FallbackRule();

  it('should have the correct name and priority', () => {
    assert.strictEqual(rule.name, 'FallbackRule');
    assert.strictEqual(rule.priority, 0); // Must be lowest
  });

  it('should match any transcript', () => {
    assert.strictEqual(rule.matches('i want a biryani'), true);
    assert.strictEqual(rule.matches('hello'), true);
    assert.strictEqual(rule.matches(''), true);
    assert.strictEqual(rule.matches('some random noise that no other rule catches'), true);
  });

  it('should resolve with 0.0 confidence and requiresClarification', () => {
    const result = rule.resolve('some text');
    
    assert.strictEqual(result.intent, ConversationIntent.Unknown);
    assert.strictEqual(result.confidence, 0.0);
    assert.strictEqual(result.requiresClarification, true);
    assert.strictEqual(result.clarificationReason, 'UnrecognizedIntent');
    assert.strictEqual(result.entities.length, 0);
  });
});
