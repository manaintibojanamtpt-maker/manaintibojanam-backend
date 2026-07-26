import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveMenuItemFromMenuMap } from '../resolveMenuItemReference.js';

function menu(entries: Record<string, Record<string, unknown>>) {
  return new Map(Object.entries(entries));
}

describe('resolveMenuItemFromMenuMap', () => {
  it('resolves by foodId / itemId to canonical ids and price', () => {
    const result = resolveMenuItemFromMenuMap(
      'tenant_1',
      menu({
        dosa_1: { name: 'Masala Dosa', price: 120, isAvailable: true, isActive: true },
      }),
      { foodId: 'dosa_1' },
    );

    assert.equal(result.status, 'resolved');
    if (result.status !== 'resolved') return;
    assert.equal(result.item.foodId, 'dosa_1');
    assert.equal(result.item.itemId, 'dosa_1');
    assert.equal(result.item.restaurantId, 'tenant_1');
    assert.equal(result.item.unitPrice, 120);
    assert.equal(result.item.matchType, 'id');
  });

  it('asks for clarification on exact-name duplicates with candidate ids', () => {
    const result = resolveMenuItemFromMenuMap(
      'tenant_1',
      menu({
        thali_a: { name: 'Daily Thali', price: 199, isAvailable: true, isActive: true },
        thali_b: { name: 'Daily Thali', price: 249, isAvailable: true, isActive: true },
      }),
      { name: 'Daily Thali' },
    );

    assert.equal(result.status, 'needs_clarification');
    if (result.status !== 'needs_clarification') return;
    assert.equal(result.code, 'AMBIGUOUS_ITEM');
    assert.equal(result.candidates.length, 2);
    assert.ok(result.questions[0]?.includes('thali_a'));
    assert.ok(result.questions[0]?.includes('thali_b'));
  });

  it('fuzzy-resolves a unique high-confidence prefix match', () => {
    const result = resolveMenuItemFromMenuMap(
      'tenant_1',
      menu({
        paneer_1: { name: 'Paneer Butter Masala', price: 260, isAvailable: true, isActive: true },
        dosa_1: { name: 'Masala Dosa', price: 120, isAvailable: true, isActive: true },
      }),
      { name: 'Paneer Butter' },
    );

    assert.equal(result.status, 'resolved');
    if (result.status !== 'resolved') return;
    assert.equal(result.item.foodId, 'paneer_1');
    assert.equal(result.item.matchType, 'fuzzy_name');
  });

  it('clarifies near-tie fuzzy candidates instead of guessing', () => {
    const result = resolveMenuItemFromMenuMap(
      'tenant_1',
      menu({
        a: { name: 'Chicken Biryani', price: 280, isAvailable: true, isActive: true },
        b: { name: 'Chicken Biryani Special', price: 320, isAvailable: true, isActive: true },
      }),
      { name: 'Chicken' },
    );

    assert.equal(result.status, 'needs_clarification');
    if (result.status !== 'needs_clarification') return;
    assert.ok(result.candidates.length >= 2);
  });

  it('requires variant clarification when multiple variants and none specified', () => {
    const result = resolveMenuItemFromMenuMap(
      'tenant_1',
      menu({
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
      }),
      { name: 'Veg Meal' },
    );

    assert.equal(result.status, 'needs_clarification');
    if (result.status !== 'needs_clarification') return;
    assert.equal(result.code, 'VARIANT_REQUIRED');
    assert.ok(result.candidates.some((c) => c.variantId === 'v-half'));
  });

  it('resolves single/default variant and uses variant price', () => {
    const result = resolveMenuItemFromMenuMap(
      'tenant_1',
      menu({
        meal_1: {
          name: 'Veg Meal',
          price: 199,
          isAvailable: true,
          isActive: true,
          variants: [{ variantId: 'v-full', displayName: 'Full', price: 199 }],
        },
      }),
      { foodId: 'meal_1' },
    );

    assert.equal(result.status, 'resolved');
    if (result.status !== 'resolved') return;
    assert.equal(result.item.variantId, 'v-full');
    assert.equal(result.item.unitPrice, 199);
  });

  it('falls through stale foodId to name match on the same restaurant menu', () => {
    const result = resolveMenuItemFromMenuMap(
      'tenant_1',
      menu({
        dosa_live: { name: 'Masala Dosa', price: 120, isAvailable: true, isActive: true },
      }),
      { foodId: 'dosa_from_other_kitchen', name: 'Masala Dosa' },
    );

    assert.equal(result.status, 'resolved');
    if (result.status !== 'resolved') return;
    assert.equal(result.item.foodId, 'dosa_live');
    assert.equal(result.item.matchType, 'exact_name');
  });

  it('reports UNAVAILABLE when foodId exists but item is not available', () => {
    const result = resolveMenuItemFromMenuMap(
      'tenant_1',
      menu({
        dosa_1: { name: 'Masala Dosa', price: 120, isAvailable: false, isActive: true },
      }),
      { foodId: 'dosa_1' },
    );

    assert.equal(result.status, 'not_found');
    if (result.status !== 'not_found') return;
    assert.equal(result.code, 'UNAVAILABLE');
  });

  it('resolves ASR / spelling variants: Medu Vada → Medu Wada, Idly → Idli', () => {
    const menuMap = menu({
      wada_1: { name: 'Medu Wada', price: 60, isAvailable: true, isActive: true },
      idli_1: { name: 'Idli', price: 60, isAvailable: true, isActive: true },
      dosa_1: { name: 'Malasa Dosa', price: 70, isAvailable: true, isActive: true },
    });

    const vada = resolveMenuItemFromMenuMap('tenant_1', menuMap, { name: 'Medu Vada' });
    assert.equal(vada.status, 'resolved');
    if (vada.status === 'resolved') {
      assert.equal(vada.item.foodId, 'wada_1');
      assert.equal(vada.item.name, 'Medu Wada');
    }

    const idly = resolveMenuItemFromMenuMap('tenant_1', menuMap, { name: 'Idly' });
    assert.equal(idly.status, 'resolved');
    if (idly.status === 'resolved') {
      assert.equal(idly.item.foodId, 'idli_1');
    }

    const masala = resolveMenuItemFromMenuMap('tenant_1', menuMap, { name: 'Masala Dosa' });
    assert.equal(masala.status, 'resolved');
    if (masala.status === 'resolved') {
      assert.equal(masala.item.foodId, 'dosa_1');
    }
  });
});
