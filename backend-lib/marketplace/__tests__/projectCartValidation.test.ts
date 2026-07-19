import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateMarketplaceCart } from '../projectCartValidation.js';

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
          where: (field: string, _op: string, value: string) => ({
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

describe('validateMarketplaceCart', () => {
  it('returns NOT_FOUND issues without throwing when menu item id is stale', async () => {
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

    const result = await validateMarketplaceCart(db, {
      restaurantId: 'tenant_1',
      orderType: 'delivery',
      lines: [
        { itemId: '8auVQIfQMljRlb8OjQId', quantity: 1, unitPrice: 188, name: 'Removed Dish' },
        { itemId: 'live_item', quantity: 1, unitPrice: 220, name: 'Paneer Tikka' },
      ],
    });

    assert.equal(result.valid, false);
    assert.equal(result.issues.length, 1);
    assert.equal(result.issues[0]?.code, 'NOT_FOUND');
    assert.equal(result.issues[0]?.itemId, '8auVQIfQMljRlb8OjQId');
    assert.equal(result.resolvedLines.length, 1);
    assert.equal(result.quote.subtotal, 220);
  });

  it('resolves stale ids by item name when menu was recreated', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        new_thali_id: {
          name: 'Daily Thali',
          price: 199,
          isAvailable: true,
          isActive: true,
        },
      },
    });

    const result = await validateMarketplaceCart(db, {
      restaurantId: 'tenant_1',
      orderType: 'pickup',
      lines: [{ itemId: 'old_thali_id', quantity: 2, unitPrice: 199, name: 'Daily Thali' }],
    });

    assert.equal(result.valid, true);
    assert.deepEqual(
      result.issues.map((issue) => issue.code),
      ['ID_UPDATED'],
    );
    assert.equal(result.resolvedLines[0]?.itemId, 'new_thali_id');
    assert.equal(result.quote.subtotal, 398);
  });

  it('marks unavailable menu items without throwing', async () => {
    const db = createFakeDb({
      tenantId: 'tenant_1',
      menu: {
        off_menu: {
          name: 'Seasonal Special',
          price: 150,
          isAvailable: false,
          isActive: true,
        },
      },
    });

    const result = await validateMarketplaceCart(db, {
      restaurantId: 'tenant_1',
      orderType: 'pickup',
      lines: [{ itemId: 'off_menu', quantity: 1, unitPrice: 150, name: 'Seasonal Special' }],
    });

    assert.equal(result.valid, false);
    assert.equal(result.issues[0]?.code, 'UNAVAILABLE');
    assert.equal(result.resolvedLines.length, 0);
    assert.equal(result.quote.grandTotal, 0);
  });
});
