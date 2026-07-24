import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeCartPlan,
  parseCartPlanRequest,
  parseCartPlansFromProposedActions,
} from '../cartActionPlan.js';
import { evaluateCartPlanRequestSafety } from '../safetyGuardrails.js';
import { validateCartActionPlan } from '../validateCartActionPlan.js';
import { buildAiAuditEvent } from '../auditContracts.js';
import { normalizeProposedAction } from '../structuredOutput.js';

type MenuDoc = Record<string, unknown>;

function createFakeDb(input: {
  tenantId: string;
  tenantSlug?: string;
  menu: Record<string, MenuDoc>;
}) {
  const tenantDoc = {
    exists: true,
    id: input.tenantId,
    data: () => ({ slug: input.tenantSlug ?? 'demo-kitchen' }),
  };

  const menuDocs = Object.entries(input.menu).map(([id, data]) => ({
    id,
    data: () => ({ tenantId: input.tenantId, ...data }),
  }));

  return {
    collection: (name: string) => {
      if (name === 'tenants') {
        return {
          doc: (id: string) => ({
            get: async () => (id === input.tenantId ? tenantDoc : { exists: false }),
          }),
          where: (_field: string, _op: string, value: string) => ({
            limit: () => ({
              get: async () => ({
                empty: value !== (input.tenantSlug ?? 'demo-kitchen'),
                docs: value === (input.tenantSlug ?? 'demo-kitchen') ? [tenantDoc] : [],
              }),
            }),
          }),
        };
      }

      if (name === 'menu') {
        return {
          where: (field: string, _op: string, value: string) => ({
            get: async () => ({
              docs: menuDocs.filter((doc) => doc.data()[field] === value),
            }),
          }),
        };
      }

      if (name === 'coupons') {
        return {
          where: () => ({
            where: () => ({
              where: () => ({
                limit: () => ({
                  get: async () => ({ empty: true, docs: [] }),
                }),
              }),
            }),
          }),
        };
      }

      throw new Error(`Unexpected collection ${name}`);
    },
  } as never;
}

describe('cartActionPlan', () => {
  it('normalizes cart plans as non-executable with confirmation required', () => {
    const action = normalizeProposedAction({
      type: 'cart_add_plan',
      executable: true,
      requiresConfirmation: false,
      payload: { itemId: 'item_1', quantity: 2 },
    });
    assert.ok(action);
    const plan = normalizeCartPlan(action);
    assert.ok(plan);
    assert.equal(plan.executable, false);
    assert.equal(plan.requiresConfirmation, true);
    assert.equal(plan.payload.itemId, 'item_1');
    assert.equal(plan.payload.quantity, 2);
  });

  it('rejects place_order during parse', () => {
    const parsed = parseCartPlansFromProposedActions([
      { type: 'place_order', payload: {} },
      { type: 'cart_add_plan', payload: { itemId: 'x' } },
    ]);
    assert.equal(parsed.rejectedPlaceOrder, true);
    assert.equal(parsed.plans.length, 1);
  });

  it('returns clarification when restaurantId is missing', () => {
    const parsed = parseCartPlanRequest({
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      proposedActions: [{ type: 'cart_add_plan', payload: { itemId: 'item_1' } }],
    });
    assert.equal(parsed.ok, false);
    if (parsed.ok) return;
    assert.equal(parsed.issues.some((issue) => issue.code === 'MISSING_RESTAURANT'), true);
    assert.ok(parsed.clarificationQuestions.length > 0);
  });
});

describe('evaluateCartPlanRequestSafety', () => {
  it('blocks place_order and executable flags', () => {
    const safety = evaluateCartPlanRequestSafety({
      mode: 'consumer_ordering',
      proposedActions: [{ type: 'place_order', executable: true }],
    });
    assert.equal(safety.allowed, false);
    assert.equal(safety.violations.some((v) => v.code === 'PLACE_ORDER_BLOCKED'), true);
    assert.equal(safety.violations.some((v) => v.code === 'CART_PLAN_EXECUTABLE_FORBIDDEN'), true);
  });

  it('allows sanitized cart plans for consumer mode', () => {
    const safety = evaluateCartPlanRequestSafety({
      mode: 'consumer_ordering',
      proposedActions: [{ type: 'cart_add_plan', payload: { itemId: 'item_1' } }],
    });
    assert.equal(safety.allowed, true);
    assert.equal(safety.sanitizedPlans.length, 1);
    assert.equal(safety.sanitizedPlans[0]?.executable, false);
    assert.equal(safety.sanitizedPlans[0]?.requiresConfirmation, true);
  });
});

describe('validateCartActionPlan', () => {
  it('validates add plans against menu via validateMarketplaceCart', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        live_item: {
          name: 'Paneer Tikka',
          price: 220,
          isAvailable: true,
          isActive: true,
        },
      },
    });

    const request = {
      mode: 'consumer_ordering' as const,
      channel: 'orderbhojan_web' as const,
      restaurantId: 'tenant_1',
      orderType: 'pickup' as const,
      proposedActions: [],
    };

    const result = await validateCartActionPlan(db, request, [
      {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { itemId: 'live_item', quantity: 1 },
      },
    ]);

    assert.equal(result.status, 'validated');
    assert.equal(result.mutatedState, false);
    assert.deepEqual(result.sideEffects, []);
    assert.equal(result.plans[0]?.executable, false);
    assert.equal(result.plans[0]?.requiresConfirmation, true);
    assert.equal(result.plans[0]?.resolvedItemId, 'live_item');
  });

  it('returns needs_clarification for ambiguous item names', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        thali_a: { name: 'Daily Thali', price: 199, isAvailable: true, isActive: true },
        thali_b: { name: 'Daily Thali', price: 249, isAvailable: true, isActive: true },
      },
    });

    const request = {
      mode: 'consumer_ordering' as const,
      channel: 'orderbhojan_web' as const,
      restaurantId: 'tenant_1',
      orderType: 'pickup' as const,
      proposedActions: [],
    };

    const result = await validateCartActionPlan(db, request, [
      {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { name: 'Daily Thali' },
      },
    ]);

    assert.equal(result.status, 'needs_clarification');
    assert.ok(result.clarificationQuestions?.length);
    assert.equal(result.mutatedState, false);
  });

  it('validates remove plans by checking menu references without mutation', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        live_item: {
          name: 'Paneer Tikka',
          price: 220,
          isAvailable: true,
          isActive: true,
        },
      },
    });

    const request = {
      mode: 'consumer_ordering' as const,
      channel: 'orderbhojan_web' as const,
      restaurantId: 'tenant_1',
      orderType: 'pickup' as const,
      proposedActions: [],
    };

    const result = await validateCartActionPlan(db, request, [
      {
        type: 'cart_remove_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { itemId: 'live_item' },
      },
    ]);

    assert.equal(result.status, 'validated');
    assert.equal(result.plans[0]?.type, 'cart_remove_plan');
    assert.equal(result.plans[0]?.executable, false);
    assert.equal(result.mutatedState, false);
  });

  it('returns invalid when menu item is missing', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {},
    });

    const request = {
      mode: 'consumer_ordering' as const,
      channel: 'orderbhojan_web' as const,
      restaurantId: 'tenant_1',
      orderType: 'pickup' as const,
      proposedActions: [],
    };

    const result = await validateCartActionPlan(db, request, [
      {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: { itemId: 'missing_item' },
      },
    ]);

    assert.equal(result.status, 'invalid');
    assert.equal(result.mutatedState, false);
    assert.ok(result.issues?.some((issue) => issue.code === 'NOT_FOUND'));
  });

  it('requires clarification for modifier payloads', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        live_item: {
          name: 'Paneer Tikka',
          price: 220,
          isAvailable: true,
          isActive: true,
        },
      },
    });

    const request = {
      mode: 'consumer_ordering' as const,
      channel: 'orderbhojan_web' as const,
      restaurantId: 'tenant_1',
      orderType: 'pickup' as const,
      proposedActions: [],
    };

    const result = await validateCartActionPlan(db, request, [
      {
        type: 'cart_add_plan',
        requiresConfirmation: true,
        executable: false,
        payload: {
          itemId: 'live_item',
          modifiers: [{ group: 'spice', choice: 'extra hot' }],
        },
      },
    ]);

    assert.equal(result.status, 'needs_clarification');
    assert.ok(result.issues?.some((issue) => issue.code === 'MODIFIER_CLARIFICATION_REQUIRED'));
  });
});

describe('auditContracts phase 4', () => {
  it('builds cart plan audit events with mutatedState false', () => {
    const event = buildAiAuditEvent({
      eventType: 'ai.cart_plan.response',
      correlationId: 'c1',
      conversationId: 'v1',
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      success: true,
      cartPlanStatus: 'validated',
      planCount: 2,
    });
    assert.equal(event.phase, 4);
    assert.equal(event.mutatedState, false);
    assert.equal(event.cartPlanStatus, 'validated');
    assert.equal(event.planCount, 2);
  });
});
