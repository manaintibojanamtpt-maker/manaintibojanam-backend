import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDiscoveryHome,
  isMarketplaceVisibleTenant,
  parseDiscoveryRequest,
  projectRestaurantPublic,
} from '../projectDiscovery.js';
import { parseFirestoreTenant } from '../projectFoodMenuV1.js';

describe('projectDiscovery', () => {
  it('only lists published or sandbox tenants on marketplace', () => {
    assert.equal(isMarketplaceVisibleTenant({ storeStatus: 'published', status: 'active' }), true);
    assert.equal(isMarketplaceVisibleTenant({ sandboxMode: true, status: 'active' }), true);
    assert.equal(isMarketplaceVisibleTenant({ storeStatus: 'draft', status: 'active' }), false);
    assert.equal(isMarketplaceVisibleTenant({ status: 'suspended' }), false);
  });

  it('projects tenant slug for OrderBhojan restaurant routes', () => {
    const tenant = parseFirestoreTenant('hari-mess', {
      slug: 'hari-mess',
      name: 'Hari Mess',
      storeStatus: 'published',
      status: 'active',
      location: { lat: 17.44, lng: 78.35 },
    });
    const restaurant = projectRestaurantPublic(
      tenant,
      { location: { lat: 17.44, lng: 78.35 } },
      { lat: 17.44, lng: 78.35 },
    );
    assert.equal(restaurant.restaurantSlug, 'hari-mess');
    assert.equal(restaurant.displayName, 'Hari Mess');
    assert.equal(restaurant.distanceKm, undefined);
  });

  it('parseDiscoveryRequest rejects missing lat/lng with LOCATION_REQUIRED', () => {
    assert.throws(
      () => parseDiscoveryRequest(new URL('http://localhost/api/marketplace/discovery')),
      (error: unknown) => {
        assert.ok(error instanceof Error);
        assert.equal((error as { code?: string }).code, 'LOCATION_REQUIRED');
        assert.equal((error as { statusCode?: number }).statusCode, 400);
        return true;
      },
    );
  });

  it('parseDiscoveryRequest accepts explicit coordinates', () => {
    const params = parseDiscoveryRequest(
      new URL('http://localhost/api/marketplace/discovery?lat=17.44&lng=78.35'),
    );
    assert.equal(params.lat, 17.44);
    assert.equal(params.lng, 78.35);
  });

  it('builds home collections from live tenant pool', () => {
    const pool = [
      projectRestaurantPublic(
        parseFirestoreTenant('lucky', { slug: 'lucky-s-kitchen', name: "Lucky's Kitchen" }),
        {},
        { lat: 17.44, lng: 78.35 },
      ),
    ];
    const home = buildDiscoveryHome(pool, { lat: 17.44, lng: 78.35, page: 1, limit: 6 });
    assert.ok(home.collections.length > 0);
    assert.equal(home.collections[0]?.restaurants[0]?.restaurantSlug, 'lucky-s-kitchen');
  });
});
