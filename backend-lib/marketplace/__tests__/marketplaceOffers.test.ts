import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isMarketplaceOfferActive,
  resolveActiveMarketplaceOffers,
  resolvePrimaryMarketplaceOfferLabel,
} from '../../domain/marketplaceOffers.js';
import type { TenantMarketplaceOffer } from '../../domain/tenant-marketplace.js';

const baseOffer = (patch: Partial<TenantMarketplaceOffer> = {}): TenantMarketplaceOffer => ({
  offerId: 'offer_1',
  enabled: true,
  displayText: '20% off orders above ₹499',
  title: 'Diwali Feast',
  badge: 'Diwali',
  priority: 0,
  ...patch,
});

describe('marketplaceOffers', () => {
  it('filters disabled and out-of-range offers', () => {
    const now = new Date('2026-10-22T12:00:00.000Z');
    const offers = [
      baseOffer({ offerId: 'paused', enabled: false }),
      baseOffer({ offerId: 'future', validFrom: '2026-10-25' }),
      baseOffer({ offerId: 'expired', validTo: '2026-10-20' }),
      baseOffer({ offerId: 'live', validFrom: '2026-10-20', validTo: '2026-10-24' }),
    ];

    const active = resolveActiveMarketplaceOffers(offers, now);
    assert.deepEqual(active.map((offer) => offer.offerId), ['live']);
    assert.equal(isMarketplaceOfferActive(baseOffer({ enabled: false }), now), false);
  });

  it('uses badge before display text for card labels', () => {
    assert.equal(resolvePrimaryMarketplaceOfferLabel(baseOffer()), 'Diwali');
    assert.equal(
      resolvePrimaryMarketplaceOfferLabel(baseOffer({ badge: undefined })),
      '20% off orders above ₹499',
    );
  });
});
