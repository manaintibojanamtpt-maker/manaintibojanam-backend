import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { CancelRule } from '../workflow/intent/rules/CancelRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

describe('CancelRule', () => {
  const rule = new CancelRule();

  it('should have the correct name and priority', () => {
    assert.strictEqual(rule.name, 'CancelRule');
    assert.strictEqual(rule.priority, 80);
  });

  it('should match normalized cancel transcripts', () => {
    // "cancelorder" is the canonical token produced by TranscriptNormalizer
    assert.strictEqual(rule.matches('cancelorder'), true);
    assert.strictEqual(rule.matches('cancelorder please'), true);
  });

  it('should not match transcripts without cancel tokens', () => {
    assert.strictEqual(rule.matches('i want a parcel'), false);
    assert.strictEqual(rule.matches('hello'), false);
    assert.strictEqual(rule.matches(''), false);
  });

  it('should resolve pure cancelorder with high confidence (1.0)', () => {
    const result = rule.resolve('cancelorder');
    
    assert.strictEqual(result.intent, ConversationIntent.Cancel);
    assert.strictEqual(result.confidence, 1.0);
    assert.strictEqual(result.requiresClarification, false);
    assert.strictEqual(result.entities.length, 0);
  });

  it('should resolve slightly mixed cancel transcripts with high confidence (0.8)', () => {
    const result = rule.resolve('cancelorder my order please'); // 4 tokens
    
    assert.strictEqual(result.intent, ConversationIntent.Cancel);
    assert.strictEqual(result.confidence, 0.8);
    assert.strictEqual(result.requiresClarification, false);
  });

  it('should resolve heavily mixed cancel transcripts with medium confidence (0.5)', () => {
    // > 5 tokens
    const result = rule.resolve('actually i think i will just cancelorder the whole thing');
    
    assert.strictEqual(result.intent, ConversationIntent.Cancel);
    assert.strictEqual(result.confidence, 0.5);
    assert.strictEqual(result.requiresClarification, false); 
  });
});
