import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { AddItemRule } from '../workflow/intent/rules/AddItemRule.js';
import { ConversationIntent } from '../models/ConversationIntent.js';

describe('AddItemRule', () => {
  const rule = new AddItemRule();

  it('should have the correct name and priority', () => {
    assert.strictEqual(rule.name, 'AddItemRule');
    assert.strictEqual(rule.priority, 50);
  });

  it('should match any transcript', () => {
    // AddItem matches globally to allow entity-based scoring
    assert.strictEqual(rule.matches('i want a biryani'), true);
    assert.strictEqual(rule.matches('chicken 65'), true);
    assert.strictEqual(rule.matches(''), true);
  });

  it('should resolve with 1.0 confidence if both FoodItem and Quantity entities exist', () => {
    const context: any = {
      entities: [
        { type: 'FoodItem', rawValue: 'biryani' },
        { type: 'Quantity', numericValue: 2 }
      ]
    };
    
    const result = rule.resolve('add two biryani', context);
    
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 1.0);
    assert.strictEqual(result.requiresClarification, false);
  });

  it('should resolve with 0.8 confidence if only FoodItem exists', () => {
    const context: any = {
      entities: [
        { type: 'FoodItem', rawValue: 'biryani' }
      ]
    };
    
    const result = rule.resolve('i want biryani', context);
    
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 0.8);
    assert.strictEqual(result.requiresClarification, false);
  });

  it('should resolve with 0.4 confidence and require clarification if verb exists but no entities', () => {
    const context: any = { entities: [] };
    
    const result = rule.resolve('add', context);
    
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 0.4);
    assert.strictEqual(result.requiresClarification, true);
    assert.strictEqual(result.clarificationReason, 'MissingFoodItem');
  });

  it('should resolve with 0.3 confidence and require clarification if only quantity exists', () => {
    const context: any = {
      entities: [
        { type: 'Quantity', numericValue: 2 }
      ]
    };
    
    const result = rule.resolve('two please', context);
    
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 0.3);
    assert.strictEqual(result.requiresClarification, true);
    assert.strictEqual(result.clarificationReason, 'MissingFoodItem');
  });

  it('should return 0.0 confidence for unrelated text without entities or verbs', () => {
    const context: any = { entities: [] };
    
    const result = rule.resolve('what is the time', context);
    
    assert.strictEqual(result.intent, ConversationIntent.AddItem);
    assert.strictEqual(result.confidence, 0.0);
    assert.strictEqual(result.requiresClarification, false); // No clarification needed, rule simply fails to match
  });
});
