import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { resolveCartAppetiteContext, resolveClimateSeason } from '../src/features/cart/domain/cartAppetiteContext.ts';
import { scoreCartAppetiteItems } from '../src/features/cart/domain/scoreCartAppetiteItems.ts';
import type { FoodPublic } from '../src/types/marketplace-food.ts';

function food(partial: Partial<FoodPublic> & Pick<FoodPublic, 'foodId' | 'name' | 'price'>): FoodPublic {
  return {
    slug: partial.foodId,
    currency: 'INR',
    category: partial.category ?? 'Mains',
    categoryId: 'mains',
    dietary: 'veg',
    availability: true,
    variants: [],
    addons: [],
    ...partial,
  };
}

describe('cart appetite upsell', () => {
  it('resolves Indian climate seasons from month', () => {
    assert.equal(resolveClimateSeason(new Date('2026-05-15T12:00:00+05:30')), 'summer');
    assert.equal(resolveClimateSeason(new Date('2026-08-15T12:00:00+05:30')), 'monsoon');
    assert.equal(resolveClimateSeason(new Date('2026-11-15T12:00:00+05:30')), 'festive');
    assert.equal(resolveClimateSeason(new Date('2026-01-15T12:00:00+05:30')), 'winter');
  });

  it('builds biryani-aware pairing copy', () => {
    const ctx = resolveCartAppetiteContext(['chicken biryani'], new Date('2026-05-15T13:00:00+05:30'));
    assert.match(ctx.headline, /Cool it down|plate|biryani/i);
    assert.ok(ctx.pairingKeywords.some((k) => /raita|curd|lassi|drink/i.test(k)));
  });

  it('ranks raita above another biryani when cart has biryani', () => {
    const ctx = resolveCartAppetiteContext(['chicken biryani'], new Date('2026-05-15T13:00:00+05:30'));
    const picks = scoreCartAppetiteItems({
      menuItems: [
        food({ foodId: '1', name: 'Mutton Biryani', price: 299, category: 'Rice' }),
        food({ foodId: '2', name: 'Boondi Raita', price: 49, category: 'Sides', recommended: true }),
        food({ foodId: '3', name: 'Sweet Lassi', price: 59, category: 'Drinks' }),
        food({
          foodId: '4',
          name: 'chicken biryani',
          price: 249,
          category: 'Rice',
        }),
      ],
      cartFoodIds: new Set(['cart-biryani']),
      cartNames: ['chicken biryani'],
      context: ctx,
      limit: 3,
    });
    assert.ok(picks.length >= 2);
    assert.equal(picks.some((p) => /raita|lassi/i.test(p.food.name)), true);
    assert.equal(picks[0]?.food.name.toLowerCase().includes('biryani'), false);
  });
});
