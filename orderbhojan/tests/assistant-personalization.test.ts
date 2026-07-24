import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadFeatureFlags, isFeatureEnabled } from '../src/featureFlags/flags';
import { buildCartAddPlansFromReorder } from '../src/features/assistant/domain/buildPersonalizationCartPlans';
import { buildPersonalizationGuidance } from '../src/features/assistant/domain/buildPersonalizationGuidance';
import {
  classifyPersonalizationIntent,
  isPersonalizationUserMessage,
} from '../src/features/assistant/domain/isPersonalizationUserMessage';
import { mapTrackingToReorderSource } from '../src/features/assistant/domain/mapTrackingToPersonalizationBootstrap';
import { assertCartPlanNonExecutable } from '../src/features/assistant/domain/cartPlanContract';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe('assistant Phase 19 personalization', () => {
  it('keeps FF_OB_AI_PERSONALIZATION OFF by default', () => {
    const flags = loadFeatureFlags();
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_PERSONALIZATION'), false);
    assert.equal(isFeatureEnabled(flags, 'FF_OB_AI_ASSISTANT'), false);
  });

  it('classifies reorder / usual / favorites intents', () => {
    assert.equal(classifyPersonalizationIntent('Reorder my last order'), 'reorder_last');
    assert.equal(classifyPersonalizationIntent('Order my usual'), 'usual_at_restaurant');
    assert.equal(classifyPersonalizationIntent('Show my favorite kitchens'), 'favorite_restaurants');
    assert.equal(isPersonalizationUserMessage('What vegetarian options look good?'), false);
  });

  it('builds non-executable cart plans from reorder payload', () => {
    const plans = buildCartAddPlansFromReorder({
      restaurantId: 'tenant_1',
      restaurantSlug: 'demo-kitchen',
      orderNumber: 'OB-9',
      items: [
        { itemId: 'item_1', name: 'Idli', quantity: 2, unitPrice: 40 },
        { itemId: 'item_2', name: 'Dosa', quantity: 1, unitPrice: 80 },
      ],
    });
    assert.equal(plans.length, 2);
    assert.equal(plans[0]?.executable, false);
    assert.equal(plans[0]?.requiresConfirmation, true);
    assert.equal(plans[0]?.payload?.foodId, 'item_1');
    assertCartPlanNonExecutable({
      schemaVersion: '5.0',
      conversationId: 'c1',
      channel: 'orderbhojan_web',
      status: 'validated',
      valid: true,
      clarificationQuestions: [],
      issues: [],
      proposedActions: plans,
      executable: false,
      sideEffects: [],
      mutatedState: false,
    });
  });

  it('maps tracking reorder without inventing variants', () => {
    const source = mapTrackingToReorderSource({
      orderId: 'ord_1',
      orderNumber: 'OB-1',
      reorder: {
        restaurantId: 't1',
        restaurantSlug: 'kitchen',
        items: [{ itemId: 'a', name: 'Tea', quantity: 1, unitPrice: 20 }],
      },
    });
    assert.ok(source);
    assert.equal(source?.items[0]?.itemId, 'a');
    assert.equal('variantId' in (source?.items[0] ?? {}), false);
  });

  it('favorites guidance navigates only and does not invent dishes', () => {
    const empty = buildPersonalizationGuidance({
      intent: 'favorite_restaurants',
      bootstrap: { favoriteRestaurants: [] },
    });
    assert.ok(empty?.hints.some((h) => h.target === '/favorites'));

    const withFavs = buildPersonalizationGuidance({
      intent: 'favorite_restaurants',
      bootstrap: {
        favoriteRestaurants: [{ id: 'r1', slug: 'spice', displayName: 'Spice Hub' }],
      },
    });
    assert.match(withFavs?.reply ?? '', /Spice Hub/);
    assert.ok(withFavs?.hints.some((h) => h.target === '/restaurant/spice/menu'));
    assert.doesNotMatch(withFavs?.reply ?? '', /cart_add_plan|added to cart/i);
  });

  it('conversation validates personalization plans and never auto-applies or uses tracking reorder API', () => {
    const conversation = readFileSync(
      path.resolve(__dirname, '../src/features/assistant/ui/useAssistantConversation.ts'),
      'utf8',
    );
    assert.match(conversation, /buildCartAddPlansFromReorder/);
    assert.match(conversation, /usePersonalizationCartPath/);
    assert.match(conversation, /ensureRestaurantContextForCartPlan/);
    assert.doesNotMatch(conversation, /useReorderFromTracking/);
    const personalizationBlock = conversation.slice(
      conversation.indexOf('usePersonalizationCartPath'),
      conversation.indexOf('usePersonalizationGuidancePath'),
    );
    assert.doesNotMatch(personalizationBlock, /applyConfirmedCartPlan/);
  });

  it('layout syncs cache bootstrap without marketplace fetches in assistant domain builders', () => {
    const layout = readFileSync(
      path.resolve(__dirname, '../src/shared/layouts/MarketplaceLayout.tsx'),
      'utf8',
    );
    assert.match(layout, /PersonalizationBootstrapSync/);
    assert.match(layout, /personalizationEnabled/);

    const builders = [
      'domain/buildPersonalizationCartPlans.ts',
      'domain/buildPersonalizationGuidance.ts',
      'domain/mapTrackingToPersonalizationBootstrap.ts',
    ];
    for (const file of builders) {
      const src = readFileSync(
        path.resolve(__dirname, '../src/features/assistant', file),
        'utf8',
      );
      assert.doesNotMatch(src, /getMarketplaceApiClient|listOrders|getTracking|listFavorites/);
    }
  });
});
