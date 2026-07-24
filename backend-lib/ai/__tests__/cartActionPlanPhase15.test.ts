import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCartPlan } from '../cartActionPlan.js';
import { validateCartActionPlan } from '../validateCartActionPlan.js';
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

describe('cartActionPlan Phase 15 resolution', () => {
  it('normalizes foodId / variant fields into cart plan payload', () => {
    const action = normalizeProposedAction({
      type: 'cart_add_plan',
      payload: {
        foodId: 'food_9',
        name: 'Idli',
        variantId: 'v1',
        variantLabel: 'Plate',
        quantity: 2,
      },
    });
    assert.ok(action);
    const plan = normalizeCartPlan(action);
    assert.ok(plan);
    assert.equal(plan.payload.foodId, 'food_9');
    assert.equal(plan.payload.variantId, 'v1');
    assert.equal(plan.executable, false);
    assert.equal(plan.requiresConfirmation, true);
  });

  it('enriches validated payload with canonical foodId, restaurantId, and live price', async () => {
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

    const result = await validateCartActionPlan(
      db,
      {
        mode: 'consumer_ordering',
        channel: 'orderbhojan_web',
        restaurantId: 'tenant_1',
        orderType: 'pickup',
        proposedActions: [],
      },
      [
        {
          type: 'cart_add_plan',
          requiresConfirmation: true,
          executable: false,
          payload: { name: 'Paneer Tikka', quantity: 1 },
        },
      ],
    );

    assert.equal(result.schemaVersion, '5.0');
    assert.equal(result.status, 'validated');
    assert.equal(result.mutatedState, false);
    assert.equal(result.plans[0]?.executable, false);
    assert.equal(result.plans[0]?.requiresConfirmation, true);
    assert.equal(result.plans[0]?.payload.foodId, 'live_item');
    assert.equal(result.plans[0]?.payload.itemId, 'live_item');
    assert.equal(result.plans[0]?.payload.restaurantId, 'tenant_1');
    assert.equal(result.plans[0]?.payload.unitPrice, 220);
    assert.equal(result.plans[0]?.payload.price, 220);
    assert.equal(result.plans[0]?.payload.name, 'Paneer Tikka');
  });

  it('fuzzy-resolves unique prefix names into canonical ids without executing', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        butter_1: {
          name: 'Butter Chicken',
          price: 300,
          isAvailable: true,
          isActive: true,
        },
        dosa_1: {
          name: 'Masala Dosa',
          price: 120,
          isAvailable: true,
          isActive: true,
        },
      },
    });

    const result = await validateCartActionPlan(
      db,
      {
        mode: 'consumer_ordering',
        channel: 'orderbhojan_web',
        restaurantId: 'tenant_1',
        orderType: 'pickup',
        proposedActions: [],
      },
      [
        {
          type: 'cart_add_plan',
          requiresConfirmation: true,
          executable: false,
          payload: { name: 'Butter Chick', quantity: 1 },
        },
      ],
    );

    assert.equal(result.status, 'validated');
    assert.equal(result.plans[0]?.payload.foodId, 'butter_1');
    assert.equal(result.plans[0]?.executable, false);
  });

  it('returns clarification-first options for ambiguous names', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        thali_a: { name: 'Daily Thali', price: 199, isAvailable: true, isActive: true },
        thali_b: { name: 'Daily Thali', price: 249, isAvailable: true, isActive: true },
      },
    });

    const result = await validateCartActionPlan(
      db,
      {
        mode: 'consumer_ordering',
        channel: 'orderbhojan_web',
        restaurantId: 'tenant_1',
        orderType: 'pickup',
        proposedActions: [],
      },
      [
        {
          type: 'cart_add_plan',
          requiresConfirmation: true,
          executable: false,
          payload: { name: 'Daily Thali' },
        },
      ],
    );

    assert.equal(result.status, 'needs_clarification');
    assert.ok(result.clarificationQuestions?.some((q) => q.includes('thali_a')));
    assert.equal(result.mutatedState, false);
    assert.deepEqual(result.sideEffects, []);
  });

  it('requires clarification for multi-variant items without variant selection', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        meal_1: {
          name: 'Veg Meal',
          price: 199,
          isAvailable: true,
          isActive: true,
          variants: [
            { variantId: 'v-half', displayName: 'Half', price: 149 },
            { variantId: 'v-full', displayName: 'Full', price: 199 },
          ],
        },
      },
    });

    const result = await validateCartActionPlan(
      db,
      {
        mode: 'consumer_ordering',
        channel: 'orderbhojan_web',
        restaurantId: 'tenant_1',
        orderType: 'pickup',
        proposedActions: [],
      },
      [
        {
          type: 'cart_add_plan',
          requiresConfirmation: true,
          executable: false,
          payload: { name: 'Veg Meal' },
        },
      ],
    );

    assert.equal(result.status, 'needs_clarification');
    assert.ok(result.issues?.some((issue) => issue.code === 'VARIANT_REQUIRED'));
  });
});
