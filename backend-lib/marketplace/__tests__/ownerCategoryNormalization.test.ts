import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  normalizeOwnerCategoryPayload,
  parseOwnerCategoryDoc,
} from '../ownerCategoryNormalization.js';
import { buildProjectedCategories } from '../projectFoodMenuV1.js';

describe('owner category normalization', () => {
  it('requires a non-empty name', () => {
    assert.throws(
      () => normalizeOwnerCategoryPayload({ name: '   ' }, 'tenant-a'),
      /Category name is required/,
    );
  });

  it('normalizes priority and defaults for owner create payload', () => {
    const category = normalizeOwnerCategoryPayload(
      { name: ' Biryani ', priority: '3', isActive: true },
      'tenant-a',
    );
    assert.deepEqual(category, {
      tenantId: 'tenant-a',
      name: 'Biryani',
      priority: 3,
      isActive: true,
      showOnHome: false,
      image: '',
    });
  });

  it('parses Firestore category docs and rejects incomplete ones', () => {
    const parsed = parseOwnerCategoryDoc('cat1', {
      tenantId: 'tenant-a',
      name: 'Starters',
      priority: 1,
      isActive: true,
    });
    assert.equal(parsed?.id, 'cat1');
    assert.equal(parsed?.name, 'Starters');
    assert.equal(parseOwnerCategoryDoc('x', { name: 'No tenant' }), null);
  });
});

describe('buildProjectedCategories', () => {
  const items = [
    {
      id: 'food_1',
      tenantId: 'tenant-a',
      name: 'Chicken Biryani',
      category: 'Biryani',
      categoryId: 'cat-biryani',
      price: 299,
      type: 'non-veg' as const,
      isAvailable: true,
    },
    {
      id: 'food_2',
      tenantId: 'tenant-a',
      name: 'Curd Rice',
      category: 'Rice',
      price: 99,
      type: 'veg' as const,
      isAvailable: true,
    },
  ];

  it('falls back to menu-string derivation when no managed categories exist', () => {
    const categories = buildProjectedCategories(items);
    assert.equal(categories.length, 2);
    assert.ok(categories.some((c) => c.name === 'Biryani' && c.itemCount === 1));
    assert.ok(categories.some((c) => c.name === 'Rice' && c.itemCount === 1));
  });

  it('prefers owner-managed order and names while keeping orphan item categories', () => {
    const categories = buildProjectedCategories(items, [
      {
        id: 'cat-biryani',
        tenantId: 'tenant-a',
        name: 'Signature Biryani',
        priority: 0,
        isActive: true,
      },
      {
        id: 'cat-hidden',
        tenantId: 'tenant-a',
        name: 'Hidden',
        priority: 9,
        isActive: false,
      },
    ]);

    assert.equal(categories[0]?.name, 'Signature Biryani');
    assert.equal(categories[0]?.itemCount, 1);
    assert.ok(categories.some((c) => c.name === 'Rice'));
    assert.ok(!categories.some((c) => c.name === 'Hidden'));
  });
});
