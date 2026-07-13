import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isConsumerListedTenant,
  isMarketplaceEligibleTenant,
  isMarketplaceVisibleTenant,
} from '../marketplaceVisibility.js';
import {
  projectTenantDiscoveryProfile,
  validateTenantPublishable,
} from '../tenantDiscoveryProfile.js';

describe('marketplaceVisibility', () => {
  it('aligns published and sandbox tenants as visible', () => {
    assert.equal(isMarketplaceVisibleTenant({ storeStatus: 'published', status: 'active' }), true);
    assert.equal(isMarketplaceVisibleTenant({ sandboxMode: true, status: 'active' }), true);
    assert.equal(isMarketplaceVisibleTenant({ storeStatus: 'draft', status: 'active' }), false);
    assert.equal(isMarketplaceVisibleTenant({ status: 'suspended' }), false);
  });

  it('requires active status for marketplace eligibility', () => {
    assert.equal(
      isMarketplaceEligibleTenant({ storeStatus: 'published', status: 'active' }),
      true,
    );
    assert.equal(
      isMarketplaceEligibleTenant({ storeStatus: 'published', status: 'suspended' }),
      false,
    );
  });
});

describe('consumerListedTenant', () => {
  it('excludes sandbox and draft tenants from consumer storefront', () => {
    assert.equal(isConsumerListedTenant({ storeStatus: 'published', status: 'active' }), true);
    assert.equal(isConsumerListedTenant({ storeStatus: 'live', status: 'active' }), true);
    assert.equal(isConsumerListedTenant({ storeStatus: 'active', status: 'active' }), true);
    assert.equal(isConsumerListedTenant({ sandboxMode: true, status: 'active' }), false);
    assert.equal(isConsumerListedTenant({ storeStatus: 'draft', status: 'active' }), false);
    assert.equal(
      isConsumerListedTenant({ storeStatus: 'published', status: 'active', slug: 'uat-sandbox-kitchen' }, 'uat-sandbox-kitchen'),
      false,
    );
  });
});

describe('tenantDiscoveryProfile', () => {
  it('projects canonical discovery profile from tenant document', () => {
    const profile = projectTenantDiscoveryProfile({
      tenantId: 'lucky-s-kitchen',
      raw: {
        slug: 'lucky-s-kitchen',
        name: "Lucky's Kitchen",
        storeStatus: 'published',
        status: 'active',
        location: { lat: 17.44, lng: 78.35, city: 'Hyderabad' },
        storeOperations: { openTime: '09:00', closeTime: '22:00', businessHoursEnabled: true },
        deliveryConfig: { enabled: true, feesConfigured: true, prepTime: 25 },
        marketplace: { cuisineTags: ['Biryani'], rating: 4.5 },
      },
      menuItemCount: 12,
    });

    assert.equal(profile.slug, 'lucky-s-kitchen');
    assert.equal(profile.visible, true);
    assert.equal(profile.menuItemCount, 12);
    assert.equal(profile.feesConfigured, true);
    assert.equal(profile.cuisines[0], 'Biryani');
  });

  it('blocks publish when location, hours, or menu are missing', () => {
    const result = validateTenantPublishable(
      { name: 'Test', slug: 'test', deliveryConfig: { enabled: true, feesConfigured: false } },
      0,
    );
    assert.equal(result.ok, false);
    assert.ok(result.errors.some((e) => e.includes('location')));
    assert.ok(result.errors.some((e) => e.includes('Store hours')));
    assert.ok(result.errors.some((e) => e.includes('menu item')));
    assert.ok(result.errors.some((e) => e.includes('feesConfigured')));
  });
});
