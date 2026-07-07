import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  projectFoodMenuV1,
  type FirestoreMenuItemRecord,
  type FirestoreTenantRecord,
} from '../projectFoodMenuV1.js';

const tenant: FirestoreTenantRecord = {
  id: 'demo-biryani-house',
  slug: 'demo-biryani-house',
  name: 'Demo Biryani House',
  marketplace: {
    publicRestaurantId: 'obr_demo_biryani_001',
    featuredFoodIds: ['food_1'],
    offers: [
      {
        offerId: 'offer_1',
        enabled: true,
        displayText: '50% OFF up to ₹100',
        priority: 1,
      },
    ],
  },
};

const items: FirestoreMenuItemRecord[] = [
  {
    id: 'food_1',
    tenantId: 'demo-biryani-house',
    name: 'Hyderabadi Chicken Biryani',
    category: 'Biryani',
    categoryId: 'cat-biryani',
    price: 299,
    type: 'non-veg',
    isAvailable: true,
    labels: [
      { kind: 'BESTSELLER', displayText: 'Bestseller' },
      { kind: 'CHEF_PICK', displayText: 'Chef recommended' },
    ],
    offer: {
      displayText: '₹50 off this weekend',
      sellingPrice: 249,
    },
  },
];

describe('Sprint 19 — Firestore food menu projection', () => {
  it('projects FoodMenuDTO v1 from tenant + menu documents', () => {
    const menu = projectFoodMenuV1(tenant, items, 'ctx-token');
    assert.equal(menu.schemaVersion, '1.0');
    assert.equal(menu.slug, 'demo-biryani-house');
    assert.equal(menu.items.length, 1);
    assert.equal(menu.items[0]?.offer?.displayText, '₹50 off this weekend');
    assert.equal(menu.items[0]?.pricing.sellingPrice?.amount, 249);
    assert.deepEqual(menu.featuredFoodIds, ['food_1']);
  });

  it('uses owner labels without renderer computation', () => {
    const menu = projectFoodMenuV1(tenant, items, 'ctx-token');
    const labels = menu.items[0]?.labels ?? [];
    assert.ok(labels.some((l) => l.kind === 'BESTSELLER' && l.displayText === 'Bestseller'));
  });

  it('projects owner variants and addon groups into FoodMenuDTO', () => {
    const richItems: FirestoreMenuItemRecord[] = [
      {
        ...items[0]!,
        variants: [
          { variantId: 'v-half', kind: 'half', displayName: 'Half', price: 199, offerPrice: 169 },
          { variantId: 'v-full', kind: 'full', displayName: 'Full', price: 299 },
        ],
        addonGroups: [
          {
            groupId: 'g-extras',
            displayName: 'Extras',
            required: false,
            options: [{ optionId: 'a-raita', displayName: 'Raita', price: 29 }],
          },
        ],
      },
    ];
    const menu = projectFoodMenuV1(tenant, richItems, 'ctx-token');
    const food = menu.items[0];
    assert.equal(food?.variants.length, 2);
    assert.equal(food?.variants[0]?.displayName, 'Half');
    assert.equal(food?.variants[0]?.absolutePrice?.amount, 169);
    assert.equal(food?.addonGroups.length, 1);
    assert.equal(food?.addonGroups[0]?.options[0]?.displayName, 'Raita');
    assert.equal(food?.addonGroups[0]?.options[0]?.pricing.price.amount, 29);
  });
});
