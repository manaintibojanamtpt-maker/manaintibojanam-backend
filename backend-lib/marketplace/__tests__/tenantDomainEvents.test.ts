import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  createTenantDomainEvent,
  inferStorefrontEventType,
  inferTenantEventTypeFromLegacySource,
} from '../../../src/domain/tenant/TenantDomainEventTypes.js';

describe('tenant domain events', () => {
  it('creates versioned tenant domain events', () => {
    const event = createTenantDomainEvent({
      type: 'MenuUpdated',
      tenantId: 'lucky-s-kitchen',
      source: 'owner_menu_create',
    });
    assert.equal(event.type, 'MenuUpdated');
    assert.equal(event.version, '1.0.0');
    assert.equal(event.payload.aggregateId, 'lucky-s-kitchen');
  });

  it('infers storefront event types from PUT payloads', () => {
    assert.equal(
      inferStorefrontEventType({ marketplace: { gallery: [{ galleryId: 'g1', url: 'x' }] } }),
      'GalleryUpdated',
    );
    assert.equal(
      inferStorefrontEventType({ deliveryConfig: { baseFee: 30 } }),
      'DeliveryUpdated',
    );
  });

  it('maps legacy sync sources to domain event types', () => {
    assert.equal(inferTenantEventTypeFromLegacySource('owner_menu_update'), 'MenuUpdated');
    assert.equal(inferTenantEventTypeFromLegacySource('owner_storefront_put'), 'StorefrontUpdated');
  });

  it('wires event bus, subscriber registry, and marketplace sync handler', () => {
    const root = process.cwd();
    const busSource = fs.readFileSync(
      path.join(root, 'backend-lib/marketplace/tenantDomainEventBus.ts'),
      'utf8',
    );
    assert.match(busSource, /publishTenantDomainEvent/);
    assert.match(busSource, /subscribeTenantDomainEvent/);
    assert.match(busSource, /tenant_domain_events/);

    const registerSource = fs.readFileSync(
      path.join(root, 'backend-lib/marketplace/registerTenantDomainEvents.ts'),
      'utf8',
    );
    assert.match(registerSource, /registerMarketplaceSyncSubscriber/);

    const subscriberSource = fs.readFileSync(
      path.join(root, 'backend-lib/marketplace/subscribers/marketplaceSyncSubscriber.ts'),
      'utf8',
    );
    assert.match(subscriberSource, /runTenantMarketplaceSync/);
  });
});
