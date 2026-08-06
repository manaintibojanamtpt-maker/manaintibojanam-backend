import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { ConversationPolicyEngine } from '../workflow/ConversationPolicyEngine.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import { ConversationStatus } from '../models/ConversationState.js';
import type { ConversationState } from '../models/ConversationState.js';

describe('ConversationPolicyEngine', () => {
  const engine = new ConversationPolicyEngine();
  
  const baseState: ConversationState = {
    sessionId: 'sess_1',
    conversationId: 'sess_1',
    tenantId: 'tenant_1',
    currentLanguage: 'en',
    currentIntent: null,
    detectedEntities: [],
    currentWorkflowStep: null,
    pendingQuestion: null,
    pendingConfirmation: false,
    currentCartReference: null,
    status: ConversationStatus.Idle,
    createdTime: 1000,
    updatedTime: 1000,
    metadata: {},
    historyReference: null,
  };

  it('should allow generic intents unconditionally', () => {
    const result = engine.evaluate(ConversationIntent.Greeting, [], baseState);
    assert.strictEqual(result.allowed, true);
  });

  it('should reject AddItem if FoodItem entity is missing', () => {
    const result = engine.evaluate(ConversationIntent.AddItem, [{ type: 'Quantity', numericValue: 2, rawValue: 'two' }], baseState);
    assert.strictEqual(result.allowed, false);
    assert.ok(result.missingEntities?.includes('FoodItem'));
  });

  it('should allow AddItem if FoodItem entity is present', () => {
    const result = engine.evaluate(ConversationIntent.AddItem, [
      { type: 'FoodItem', rawValue: 'Biryani' }
    ], baseState);
    assert.strictEqual(result.allowed, true);
  });

  it('should reject Checkout if cart is empty', () => {
    const stateWithNoCart = { ...baseState, currentCartReference: null };
    const result = engine.evaluate(ConversationIntent.Checkout, [{ type: 'Address', rawValue: '123 St' }], stateWithNoCart);
    assert.strictEqual(result.allowed, false);
    assert.match(result.reason || '', /Cart is empty/);
  });

  it('should reject Checkout if address is missing', () => {
    const stateWithCart = { ...baseState, currentCartReference: 'cart_123' };
    const result = engine.evaluate(ConversationIntent.Checkout, [], stateWithCart);
    assert.strictEqual(result.allowed, false);
    assert.ok(result.missingEntities?.includes('Address'));
  });

  it('should allow Checkout if cart exists and address is present', () => {
    const stateWithCart = { ...baseState, currentCartReference: 'cart_123' };
    const result = engine.evaluate(ConversationIntent.Checkout, [{ type: 'Address', rawValue: '123 St' }], stateWithCart);
    assert.strictEqual(result.allowed, true);
  });
});
