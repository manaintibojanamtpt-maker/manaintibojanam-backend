import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPostOrderTriageGuidance } from '../src/features/assistant/domain/buildPostOrderTriageGuidance';
import {
  classifyPostOrderHighRiskMessage,
  isPostOrderHighRiskMessage,
} from '../src/features/assistant/domain/postOrderHighRiskIntents';
import { isPostOrderUserMessage } from '../src/features/assistant/domain/isPostOrderUserMessage';
import {
  isAllowedPostOrderHintTarget,
  toPostOrderHints,
} from '../src/features/assistant/domain/postOrderPolicy';
import { OB_SUPPORT_EMAIL, OB_SUPPORT_MAILTO } from '../src/config/support';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('assistant Phase 18 high-risk triage', () => {
  it('detects cancel / refund / payment issue messages', () => {
    assert.equal(isPostOrderHighRiskMessage('How do I cancel this order?'), true);
    assert.equal(classifyPostOrderHighRiskMessage('I need a refund'), 'refund');
    assert.equal(classifyPostOrderHighRiskMessage('My payment failed on UPI'), 'payment_issue');
    assert.equal(isPostOrderUserMessage('I need a refund for this order'), true);
    assert.equal(isPostOrderHighRiskMessage('Where is my order?'), false);
  });

  it('builds clarification + escalation without promising outcomes', () => {
    const triage = buildPostOrderTriageGuidance({
      message: 'Please refund my order',
    });
    assert.ok(triage);
    assert.equal(triage?.riskKind, 'refund');
    assert.ok(triage?.clarificationQuestions.length);
    assert.ok(triage?.escalationHints.some((h) => h.target.startsWith('mailto:')));
    assert.ok(triage?.escalationHints.some((h) => h.target === '/profile'));
    assert.match(triage?.systemNote ?? '', /cannot cancel|cannot.*refund|no outcome/i);
    assert.doesNotMatch(triage?.systemNote ?? '', /has been refunded|will be refunded today/i);
  });

  it('allows profile + mailto escalation hints and still strips mutations', () => {
    assert.equal(isAllowedPostOrderHintTarget('navigate', '/profile'), true);
    assert.equal(isAllowedPostOrderHintTarget('open_url', OB_SUPPORT_MAILTO), true);
    assert.equal(isAllowedPostOrderHintTarget('open_url', 'https://evil.example'), false);
    assert.equal(isAllowedPostOrderHintTarget('navigate', '/checkout'), false);

    const hints = toPostOrderHints([
      { type: 'refund' },
      { type: 'cancel_order' },
      { type: 'navigate', payload: { path: '/profile' } },
      { type: 'open_url', payload: { url: OB_SUPPORT_MAILTO } },
      { type: 'navigate', payload: { path: '/orders/abc/track' } },
      { type: 'navigate', payload: { path: '/checkout' } },
    ]);

    assert.deepEqual(
      hints.map((h) => h.target ?? h.type),
      ['/profile', OB_SUPPORT_MAILTO, '/orders/abc/track'],
    );
    assert.equal(OB_SUPPORT_EMAIL, 'support@orderbhojan.com');
  });

  it('conversation wires triage guidance and mailto follow without execution APIs', () => {
    const conversation = readFileSync(
      path.resolve(__dirname, '../src/features/assistant/ui/useAssistantConversation.ts'),
      'utf8',
    );
    assert.match(conversation, /buildPostOrderTriageGuidance/);
    assert.match(conversation, /mailto:|tel:/);
    assert.match(conversation, /openExternalUrl/);
    assert.doesNotMatch(conversation, /cancelOrder|requestRefund|razorpayRefund|capturePayment/);
  });

  it('sheet includes triage starters and non-execution copy', () => {
    const sheet = readFileSync(
      path.resolve(__dirname, '../src/features/assistant/ui/ConsumerAssistantSheet.tsx'),
      'utf8',
    );
    assert.match(sheet, /My payment didn.t go through|I need a refund|How do I cancel/);
    assert.match(sheet, /never cancels, refunds, or promises outcomes/);
  });
});
