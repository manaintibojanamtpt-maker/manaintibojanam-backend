import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CheckoutRule } from '../workflow/intent/rules/CheckoutRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

describe('CheckoutRule', () => {
  const rule = new CheckoutRule();

  it('should have the correct name and priority', () => {
    assert.strictEqual(rule.name, 'CheckoutRule');
    assert.strictEqual(rule.priority, 70);
  });

  it('should match normalized checkout transcripts', () => {
    assert.strictEqual(rule.matches('checkout'), true);
    assert.strictEqual(rule.matches('takeaway'), true);
    assert.strictEqual(rule.matches('can i checkout please'), true);
  });

  it('should not match transcripts without checkout tokens', () => {
    assert.strictEqual(rule.matches('i want a biryani'), false);
    assert.strictEqual(rule.matches('cancel order'), false);
    assert.strictEqual(rule.matches(''), false);
  });

  it('should resolve pure checkout with high confidence (1.0)', () => {
    const result = rule.resolve('checkout');
    
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
    assert.strictEqual(result.confidence, 1.0);
    assert.strictEqual(result.requiresClarification, false);
    assert.strictEqual(result.entities.length, 0);
  });

  it('should resolve takeaway and extract OrderType entity with high confidence', () => {
    const result = rule.resolve('takeaway');
    
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
    // Base is 1.0, entity bonus 0.05 capped at 1.0
    assert.strictEqual(result.confidence, 1.0);
    assert.strictEqual(result.requiresClarification, false);
    assert.strictEqual(result.entities.length, 1);
    assert.strictEqual(result.entities[0].type, 'OrderType');
    assert.strictEqual(result.entities[0].normalizedValue, 'takeaway');
  });

  it('should resolve mixed checkout phrasing with medium/high confidence (0.8)', () => {
    const result = rule.resolve('make it a takeaway'); // 4 tokens
    
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
    // Base 0.8 + 0.05 bonus = 0.85
    assert.strictEqual(result.confidence, 0.85);
  });

  it('should resolve highly mixed phrasing with medium confidence (0.6)', () => {
    const result = rule.resolve('i think i am ready to checkout my food right now'); // > 5 tokens
    
    assert.strictEqual(result.intent, ConversationIntent.Checkout);
    assert.strictEqual(result.confidence, 0.6);
  });
});
