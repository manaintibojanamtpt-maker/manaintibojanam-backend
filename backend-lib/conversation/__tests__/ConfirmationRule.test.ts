import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConfirmationRule } from '../workflow/intent/rules/ConfirmationRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

describe('ConfirmationRule', () => {
  const rule = new ConfirmationRule();

  it('should have the correct name and priority', () => {
    assert.strictEqual(rule.name, 'ConfirmationRule');
    assert.strictEqual(rule.priority, 90);
  });

  it('should match normalized confirmation transcripts', () => {
    assert.strictEqual(rule.matches('yes'), true);
    assert.strictEqual(rule.matches('no'), true);
    assert.strictEqual(rule.matches('yes please'), true);
  });

  it('should not match transcripts without yes/no', () => {
    assert.strictEqual(rule.matches('i want a parcel'), false);
    assert.strictEqual(rule.matches('hello'), false);
    assert.strictEqual(rule.matches(''), false);
  });

  it('should resolve pure yes with high confidence and true booleanValue', () => {
    const result = rule.resolve('yes');
    
    assert.strictEqual(result.intent, ConversationIntent.Confirmation);
    assert.strictEqual(result.confidence, 1.0);
    assert.strictEqual(result.requiresClarification, false);
    assert.strictEqual(result.entities.length, 1);
    assert.strictEqual(result.entities[0].type, 'Confirmation');
    assert.strictEqual(result.entities[0].booleanValue, true);
  });

  it('should resolve pure no with high confidence and false booleanValue', () => {
    const result = rule.resolve('no');
    
    assert.strictEqual(result.intent, ConversationIntent.Confirmation);
    assert.strictEqual(result.confidence, 1.0);
    assert.strictEqual(result.requiresClarification, false);
    assert.strictEqual(result.entities.length, 1);
    assert.strictEqual(result.entities[0].type, 'Confirmation');
    assert.strictEqual(result.entities[0].booleanValue, false);
  });

  it('should resolve contradictory yes/no with low confidence and requiresClarification', () => {
    const result = rule.resolve('no wait yes');
    
    assert.strictEqual(result.intent, ConversationIntent.Confirmation);
    assert.strictEqual(result.confidence, 0.3);
    assert.strictEqual(result.requiresClarification, true);
  });

  it('should resolve mixed confirmations with medium confidence (0.6)', () => {
    const result = rule.resolve('yes i would like that');
    
    assert.strictEqual(result.intent, ConversationIntent.Confirmation);
    assert.strictEqual(result.confidence, 0.6);
    assert.strictEqual(result.requiresClarification, false); // Resolver might enforce this later if < 0.5, but 0.6 is safe
    assert.strictEqual(result.entities.length, 1);
    assert.strictEqual(result.entities[0].booleanValue, true);
  });
});
