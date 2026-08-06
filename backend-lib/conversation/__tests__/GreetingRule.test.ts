import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { GreetingRule } from '../workflow/intent/rules/GreetingRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

describe('GreetingRule', () => {
  const rule = new GreetingRule();

  it('should have the correct name and priority', () => {
    assert.strictEqual(rule.name, 'GreetingRule');
    assert.strictEqual(rule.priority, 10);
  });

  it('should match pure greeting transcripts', () => {
    assert.strictEqual(rule.matches('hi'), true);
    assert.strictEqual(rule.matches('hello'), true);
    assert.strictEqual(rule.matches('namaste'), true);
    assert.strictEqual(rule.matches('namaskaram'), true);
  });

  it('should match mixed transcripts containing greetings', () => {
    assert.strictEqual(rule.matches('hi i want a parcel'), true);
    assert.strictEqual(rule.matches('hello can i order'), true);
  });

  it('should not match transcripts without greetings', () => {
    assert.strictEqual(rule.matches('i want a parcel'), false);
    assert.strictEqual(rule.matches('cancel order'), false);
    assert.strictEqual(rule.matches('yes please'), false);
  });

  it('should resolve pure greetings with high confidence (1.0)', () => {
    const result = rule.resolve('hello');
    
    assert.strictEqual(result.intent, ConversationIntent.Greeting);
    assert.strictEqual(result.confidence, 1.0);
    assert.strictEqual(result.requiresClarification, false);
    assert.strictEqual(result.entities.length, 0);
  });

  it('should resolve multi-word pure greetings with high confidence', () => {
    const result = rule.resolve('hi hello');
    
    assert.strictEqual(result.intent, ConversationIntent.Greeting);
    assert.strictEqual(result.confidence, 1.0);
  });

  it('should resolve mixed greeting transcripts with low confidence (0.4)', () => {
    const result = rule.resolve('hi i want biryani');
    
    assert.strictEqual(result.intent, ConversationIntent.Greeting);
    assert.strictEqual(result.confidence, 0.4);
    assert.strictEqual(result.requiresClarification, false); // IntentResolver will flip this if it wins
    
    // Check breakdown
    assert.strictEqual(result._confidenceBreakdown?.finalScore, 0.4);
  });
});
