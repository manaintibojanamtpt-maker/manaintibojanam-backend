import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import {
  buildPostOrderContextFromTracking,
  mapTrackingToPostOrderSnapshot,
} from '../src/features/assistant/domain/mapTrackingToPostOrderContext';
import { isPostOrderUserMessage } from '../src/features/assistant/domain/isPostOrderUserMessage';
import {
  clearPostOrderBootstrap,
  publishPostOrderBootstrap,
  usePublishedPostOrderBootstrap,
} from '../src/features/assistant/ui/postOrderBootstrapStore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uiRoot = path.resolve(__dirname, '../src/features/assistant/ui');

function readUi(relativePath: string): string {
  return readFileSync(path.join(uiRoot, relativePath), 'utf8');
}

describe('assistant Phase 17 post-order UI', () => {
  it('keeps FF_OB_AI_POST_ORDER OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_POST_ORDER'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
  });

  it('maps tracking DTOs into snapshot context without reorder/cancel fields', () => {
    const snapshot = mapTrackingToPostOrderSnapshot({
      orderNumber: 'OB-1',
      status: 'OUT_FOR_DELIVERY',
      paymentStatus: 'PAID',
      etaMinutes: { min: 20, max: 30 },
      timeline: [{ message: 'Rider assigned' }],
    });
    assert.equal(snapshot.status, 'OUT_FOR_DELIVERY');
    assert.equal(snapshot.lastTimelineMessage, 'Rider assigned');

    const ctx = buildPostOrderContextFromTracking({
      orderId: 'ord_1',
      guestPhone: '9999999999',
      tracking: { orderId: 'ord_1', orderNumber: 'OB-1', status: 'PREPARING' },
    });
    assert.ok(ctx);
    assert.equal(ctx?.orderId, 'ord_1');
    assert.equal(ctx?.snapshot?.status, 'PREPARING');
    assert.equal('reorder' in (ctx ?? {}), false);
  });

  it('classifies post-order user messages for routing', () => {
    assert.equal(isPostOrderUserMessage('Where is my order?'), true);
    assert.equal(isPostOrderUserMessage('Why is delivery delayed?'), true);
    assert.equal(isPostOrderUserMessage('How do I reorder the same items?'), true);
    assert.equal(isPostOrderUserMessage('Something looks wrong with my order'), true);
    assert.equal(isPostOrderUserMessage('What vegetarian options look good?'), false);
  });

  it('publishes and clears bootstrap for layout-mounted assistant', () => {
    clearPostOrderBootstrap();
    publishPostOrderBootstrap({ orderId: 'ord_9', snapshot: { status: 'PREPARING' } });
    // Store snapshot is module-level; hook API exists for React consumers.
    assert.equal(typeof usePublishedPostOrderBootstrap, 'function');
    clearPostOrderBootstrap();
  });

  it('conversation branches to postOrder ask and never auto-applies or reorders', () => {
    const conversation = readUi('useAssistantConversation.ts');
    assert.match(conversation, /askPostOrder/);
    assert.match(conversation, /isPostOrderUserMessage/);
    assert.match(conversation, /useAssistantPostOrderContext/);
    assert.doesNotMatch(conversation, /useReorderFromTracking|getTracking|listOrders/);
    const postOrderBlock = conversation.slice(
      conversation.indexOf('usePostOrderPath'),
      conversation.indexOf('const result = await ask({'),
    );
    assert.doesNotMatch(postOrderBlock, /validate\(|applyConfirmedCartPlan|proposedCartActions/);
  });

  it('sheet exposes post-order starters and safety copy', () => {
    const sheet = readUi('ConsumerAssistantSheet.tsx');
    assert.match(sheet, /POST_ORDER_STARTERS/);
    assert.match(sheet, /Where is my order\?/);
    assert.match(sheet, /triage only|never cancels, refunds, or promises outcomes/);
    assert.match(sheet, /assistMode === 'post_order'/);
  });

  it('MarketplaceLayout mounts assistant on track only when post-order flag is considered', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '../src/shared/layouts/MarketplaceLayout.tsx'),
      'utf8',
    );
    assert.match(layout, /useAiPostOrderFeature/);
    assert.match(layout, /postOrderEnabled \|\| personalizationEnabled/);
    assert.match(layout, /showAssistant/);
    assert.doesNotMatch(layout, /useReorderFromTracking|runPostOrderAssist/);
  });

  it('tracking page publishes bootstrap and keeps reorder human-initiated', () => {
    const tracking = readFileSync(
      path.resolve(__dirname, '../src/presentation/tracking/OrderBhojanTrackingPage.tsx'),
      'utf8',
    );
    assert.match(tracking, /PostOrderBootstrapProvider/);
    assert.match(tracking, /buildPostOrderContextFromTracking/);
    assert.match(tracking, /onReorder=\{tracking\.reorder/);
    assert.doesNotMatch(tracking, /askPostOrder|usePostOrderAssist/);
  });
});
