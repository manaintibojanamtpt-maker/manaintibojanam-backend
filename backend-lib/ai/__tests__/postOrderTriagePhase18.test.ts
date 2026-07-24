import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { classifyIntentHeuristic, isIntentAllowedForMode } from '../intentTaxonomy.js';
import { buildPostOrderSystemAddon } from '../postOrderAssistContracts.js';
import { detectClaimedSideEffects } from '../safetyGuardrails.js';

describe('Phase 18 post-order high-risk triage', () => {
  it('classifies cancel / refund / payment_issue before generic payment_help', () => {
    assert.equal(
      classifyIntentHeuristic('consumer_ordering', 'How do I cancel this order?'),
      'cancel_order',
    );
    assert.equal(
      classifyIntentHeuristic('consumer_ordering', 'I need a refund for this order'),
      'refund',
    );
    assert.equal(
      classifyIntentHeuristic('consumer_ordering', 'My payment failed on UPI'),
      'payment_issue',
    );
    assert.equal(
      classifyIntentHeuristic('consumer_ordering', 'How do I pay with UPI at checkout?'),
      'payment_help',
    );
    assert.equal(isIntentAllowedForMode('consumer_ordering', 'cancel_order'), true);
    assert.equal(isIntentAllowedForMode('consumer_ordering', 'refund'), true);
    assert.equal(isIntentAllowedForMode('consumer_ordering', 'payment_issue'), true);
  });

  it('post-order addon requires triage-only language and escalation channels', () => {
    const addon = buildPostOrderSystemAddon({
      orderId: 'ord_1',
      snapshot: { status: 'PREPARING', paymentStatus: 'PAID', orderNumber: 'OB-1' },
    });
    assert.match(addon, /triage only/i);
    assert.match(addon, /Never promise/i);
    assert.match(addon, /mailto:support@orderbhojan\.com/);
    assert.match(addon, /MUST NOT cancel/);
    assert.match(addon, /orderNumber=OB-1/);
  });

  it('blocks claimed cancel/refund outcomes in reply text', () => {
    assert.equal(detectClaimedSideEffects('I have cancelled your order.'), true);
    assert.equal(detectClaimedSideEffects('Your refund has been processed.'), true);
    assert.equal(
      detectClaimedSideEffects('I cannot cancel orders here — email support with your order number.'),
      false,
    );
    assert.equal(
      detectClaimedSideEffects('If cancelled, refunds typically take 5–7 business days pending confirmation.'),
      false,
    );
  });
});
