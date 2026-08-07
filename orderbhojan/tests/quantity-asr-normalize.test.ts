import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeQuantityAsr,
  parseQuantityOnlyMessage,
  parseCartAddUserMessage,
} from '../src/features/assistant/domain/isCartAddUserMessage.ts';
import { patchPendingPlanQuantity } from '../src/features/assistant/domain/patchPendingPlanQuantity.ts';
import type { CartPlanValidationResult } from '../src/features/assistant/domain/cartPlanContract.ts';

describe('quantity ASR — two→to regressions', () => {
  it('rewrites “to quantity” to two', () => {
    assert.equal(normalizeQuantityAsr('to quantity'), 'two quantity');
    assert.equal(normalizeQuantityAsr('too qty'), 'two qty');
    assert.equal(parseQuantityOnlyMessage('to quantity'), 2);
    assert.equal(parseQuantityOnlyMessage('too'), 2); // bare ASR “too” while clarifying qty
    assert.equal(parseQuantityOnlyMessage('two'), 2);
    assert.equal(parseQuantityOnlyMessage('2 quantity'), 2);
    assert.equal(parseQuantityOnlyMessage('make it to'), 2);
  });

  it('does not break “add X to cart”', () => {
    const parsed = parseCartAddUserMessage('add Masala Dosa to cart');
    assert.ok(parsed);
    assert.equal(parsed!.quantity, 1);
    assert.match(parsed!.itemName, /masala dosa/i);
  });

  it('parses “add to quantity Masala Dosa from Inti” as qty 2', () => {
    const parsed = parseCartAddUserMessage('add to quantity Masala Dosa from Inti bhojanam');
    assert.ok(parsed);
    assert.equal(parsed!.quantity, 2);
    assert.match(parsed!.itemName, /masala dosa/i);
  });

  it('patches pending plan quantity without wiping dish', () => {
    const pending = {
      schemaVersion: '5.0',
      conversationId: 'c1',
      channel: 'orderbhojan_web',
      status: 'validated',
      valid: true,
      clarificationQuestions: [],
      issues: [],
      proposedActions: [
        {
          type: 'cart_add_plan',
          requiresConfirmation: true,
          executable: false,
          payload: { name: 'Masala Dosa', quantity: 1, restaurantId: 'obr_x' },
        },
      ],
      executable: false,
      sideEffects: [],
      mutatedState: false,
    } as CartPlanValidationResult;
    const patched = patchPendingPlanQuantity(pending, 2);
    assert.equal(patched.proposedActions[0]!.payload!.quantity, 2);
    assert.equal(patched.proposedActions[0]!.payload!.name, 'Masala Dosa');
  });
});
