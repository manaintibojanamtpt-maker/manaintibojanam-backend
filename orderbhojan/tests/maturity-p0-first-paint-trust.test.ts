import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { formatDeliveryFee } from '../src/features/discovery/utils/restaurantDisplay.ts';
import { PRICING_TRUST } from '../src/features/experience/domain/pricingTrustCopy.ts';
import type { RestaurantPublic } from '../src/types/marketplace.ts';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

function readSrc(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('maturity P0 — first paint + pricing trust', () => {
  it('does not await IndexedDB hydrate before renderApp', () => {
    const main = readSrc('src/main.tsx');
    assert.match(main, /seedDiscoveryQueryCacheFromSession\(\)/);
    assert.match(main, /void hydrateDiscoverySessionCacheFromIdb/);
    // Sequential await of IDB before ensureAppConfig must be gone.
    assert.doesNotMatch(
      main,
      /await hydrateDiscoverySessionCacheFromIdb[\s\S]*await ensureAppConfig/,
    );
  });

  it('seeds home hero from session cache (fallback DEFAULT) to avoid flash', () => {
    const hero = readSrc('src/features/experience/hooks/useHomeHeroConfig.ts');
    const main = readSrc('src/main.tsx');
    assert.match(hero, /readHomeHeroSessionCache/);
    assert.match(hero, /writeHomeHeroSessionCache/);
    assert.match(hero, /initialData:\s*seed\.config/);
    assert.match(hero, /refetchOnWindowFocus:\s*true/);
    assert.match(main, /seedHomeHeroQueryCacheFromSession/);
    assert.match(main, /warmHomeHeroBeforePaint/);
  });

  it('allows guest browse on home (no auth redirect after session ready)', () => {
    const browse = readSrc('src/features/auth/ui/RequireBrowseAuth.tsx');
    assert.doesNotMatch(browse, /Navigate/);
    assert.match(browse, /Guests may browse|browsing does not require/i);
  });

  it('shows Fee at checkout when delivery fee is unknown', () => {
    const restaurant = {
      deliveryFee: null,
    } as unknown as RestaurantPublic;
    assert.equal(formatDeliveryFee(restaurant), PRICING_TRUST.feeAtCheckout);
    assert.equal(
      formatDeliveryFee({ deliveryFee: 0 } as unknown as RestaurantPublic),
      'Free',
    );
    assert.equal(
      formatDeliveryFee({ deliveryFee: 29 } as unknown as RestaurantPublic),
      '₹29',
    );
  });

  it('surfaces ₹0 platform fee trust copy on home, cart, checkout, success', () => {
    assert.match(PRICING_TRUST.checkoutHint, /₹0 platform fee/i);
    assert.match(PRICING_TRUST.successNote, /₹0 platform fee/i);
    assert.doesNotMatch(PRICING_TRUST.checkoutHint, /commission/i);

    const home = readSrc('src/features/experience/ui/home/HomeExperiencePage.tsx');
    assert.match(home, /home-pricing-trust-banner/);
    assert.match(home, /₹0 platform fee/);

    const cart = readSrc('src/presentation/cart/OrderBhojanCartExperience.tsx');
    assert.match(cart, /₹0 platform fee/);

    const checkout = readSrc('src/presentation/checkout/OrderBhojanCheckoutPage.tsx');
    assert.match(checkout, /PRICING_TRUST\.checkoutHint/);

    const success = readSrc('src/presentation/checkout/OrderBhojanOrderTrustPanel.tsx');
    assert.match(success, /order-pricing-trust/);
  });

  it('shows progressive refresh cue while kitchens revalidate', () => {
    const feed = readSrc('src/features/discovery/ui/DiscoveryHomeFeed.tsx');
    assert.match(feed, /discovery-stale-refresh/);
    assert.match(feed, /Updating kitchens near you/);
  });
});
