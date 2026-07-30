import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import type { CartPlanValidationResult } from '../src/features/assistant/domain/cartPlanContract';
import { createOrderBhojanVoiceAdapter } from '../src/features/voice/adapters/orderBhojanVoiceAdapter.ts';
import {
  isVoiceCoreConfirmAddReady,
  validateEnrichedCartAdd,
} from '../src/features/voice/application/enrichedCartAddValidate.ts';

function validatedPlan(overrides?: Partial<CartPlanValidationResult>): CartPlanValidationResult {
  return {
    schemaVersion: '5.0',
    conversationId: 'conv_1',
    channel: 'web',
    status: 'validated',
    valid: true,
    clarificationQuestions: [],
    issues: [],
    proposedActions: [
      {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { name: 'Masala Dosa', quantity: 1, itemId: 'item_1', price: 80 },
      },
    ],
    executable: false,
    sideEffects: [],
    mutatedState: false,
    ...overrides,
  };
}

describe('Phase 1.3 enriched voice adapter (parity prep)', () => {
  it('readiness gate requires enriched validate AND restaurant context ensure', () => {
    assert.equal(
      isVoiceCoreConfirmAddReady({
        hasEnrichedValidate: true,
        hasRestaurantContextEnsure: true,
      }),
      true,
    );
    assert.equal(
      isVoiceCoreConfirmAddReady({
        hasEnrichedValidate: true,
        hasRestaurantContextEnsure: false,
      }),
      false,
    );
    assert.equal(
      isVoiceCoreConfirmAddReady({
        hasEnrichedValidate: false,
        hasRestaurantContextEnsure: true,
      }),
      false,
    );
  });

  it('adapter isConfirmAddReady mirrors readiness gate', () => {
    const notReady = createOrderBhojanVoiceAdapter({
      cartMutators: {
        addItem: () => undefined,
        setQuantity: () => undefined,
      },
      validateCartPlan: async () => validatedPlan(),
    });
    assert.equal(notReady.isConfirmAddReady(), false);

    const ready = createOrderBhojanVoiceAdapter({
      cartMutators: {
        addItem: () => undefined,
        setQuantity: () => undefined,
      },
      enrichedValidate: {
        validate: async () => validatedPlan(),
        getActiveRestaurant: () => ({ restaurantId: 'r1', restaurantSlug: 'lucky' }),
        getCoords: () => ({ lat: 18.5, lng: 73.9 }),
        getNearbyKitchens: () => [{ id: 'r1', name: 'Lucky Kitchen' }],
        prefetch: async () => undefined,
      },
      ensureRestaurantContext: async () => undefined,
    });
    assert.equal(ready.isConfirmAddReady(), true);
  });

  it('confirm refuses enriched path when restaurant ensure is missing', async () => {
    const adapter = createOrderBhojanVoiceAdapter({
      cartMutators: {
        addItem: () => undefined,
        setQuantity: () => undefined,
      },
      enrichedValidate: {
        validate: async () => validatedPlan(),
        getActiveRestaurant: () => ({ restaurantId: 'r1', restaurantSlug: 'lucky' }),
        getCoords: () => null,
        getNearbyKitchens: () => [{ id: 'r1', name: 'Lucky Kitchen' }],
        prefetch: async () => undefined,
      },
      // intentionally omit ensureRestaurantContext
    });

    const propose = await adapter.proposeAddItemToCart({
      itemName: 'Masala Dosa',
      quantity: 1,
      kitchenHint: 'Lucky Kitchen',
    });
    assert.equal(propose.ok, true);
    if (!propose.ok) return;

    const confirm = await adapter.confirmPendingChange(propose.data.planId);
    assert.equal(confirm.ok, false);
    if (confirm.ok) return;
    assert.equal(confirm.code, 'NOT_SUPPORTED');
  });

  it('confirm calls ensureRestaurantContext then apply with userConfirmed', async () => {
    const ensureCalls: string[] = [];
    const addCalls: unknown[] = [];
    const adapter = createOrderBhojanVoiceAdapter({
      cartMutators: {
        addItem: (item) => {
          addCalls.push(item);
        },
        setQuantity: () => undefined,
      },
      enrichedValidate: {
        validate: async () => validatedPlan(),
        getActiveRestaurant: () => ({ restaurantId: 'r1', restaurantSlug: 'lucky' }),
        getCoords: () => ({ lat: 18.5, lng: 73.9 }),
        getNearbyKitchens: () => [{ id: 'r1', name: 'Lucky Kitchen' }],
        prefetch: async () => undefined,
      },
      ensureRestaurantContext: async (restaurant) => {
        ensureCalls.push(`${restaurant.restaurantId}:${restaurant.restaurantSlug}`);
      },
    });

    const propose = await adapter.proposeAddItemToCart({
      itemName: 'Masala Dosa',
      quantity: 1,
      kitchenHint: 'Lucky Kitchen',
    });
    assert.equal(propose.ok, true);
    if (!propose.ok) return;

    const confirm = await adapter.confirmPendingChange(propose.data.planId);
    assert.equal(confirm.ok, true);
    assert.deepEqual(ensureCalls, ['r1:lucky']);
    assert.equal(addCalls.length >= 1, true);
    assert.equal(adapter.getPendingPlan(), null);
  });

  it('enriched validate returns NEEDS_KITCHEN without active or hinted kitchen', async () => {
    const result = await validateEnrichedCartAdd(
      { itemName: 'Masala Dosa', quantity: 1 },
      {
        validate: async () => validatedPlan(),
        getActiveRestaurant: () => ({ restaurantId: null, restaurantSlug: null }),
        getCoords: () => null,
        getNearbyKitchens: () => [],
        prefetch: async () => undefined,
      },
    );
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.code, 'NEEDS_KITCHEN');
  });
});
