import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('OB unified location (last-mile)', () => {
  it('LocationChip renders from DeliveryAddressV2 shortLabel', () => {
    const chip = readFileSync(join(root, 'src/features/location/ui/LocationChip.tsx'), 'utf8');
    assert.match(chip, /subscribeLocationStore/);
    assert.match(chip, /v2Address\?\.text\?\.shortLabel/);
    assert.match(chip, /Set delivery location/);
    assert.match(chip, /openSelector/);
  });

  it('LocationProvider wires shared AddressConfirmationSheet', () => {
    const provider = readFileSync(join(root, 'src/features/location/ui/LocationProvider.tsx'), 'utf8');
    assert.match(provider, /AddressConfirmationSheet/);
    assert.match(provider, /confirmationOpen/);
    assert.match(provider, /confirmAddress/);
  });

  it('checkout gate blocks when flat is missing', async () => {
    const { resolveObDeliveryLocationGate, hasReadyDeliveryLocation } = await import(
      '../src/features/location/domain/locationReadiness.ts'
    );

    const coordsOnly = {
      kind: 'session' as const,
      displayLabel: 'Koregaon Park',
      coordinates: {
        lat: 18.54,
        lng: 73.89,
        source: 'gps' as const,
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    assert.equal(resolveObDeliveryLocationGate(coordsOnly), 'needs_flat');
    assert.equal(hasReadyDeliveryLocation(coordsOnly), false);
  });

  it('checkout gate fast path when flat is confirmed in V2 store', async () => {
    const { hasReadyDeliveryLocation } = await import(
      '../src/features/location/domain/locationReadiness.ts'
    );
    const { normalizeAddressText } = await import('@bhojan/location-core');

    const ready = {
      kind: 'session' as const,
      displayLabel: '402, Koregaon Park',
      coordinates: {
        lat: 18.54,
        lng: 73.89,
        source: 'gps' as const,
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
    };

    const { marketplaceLocationToV2, persistMarketplaceAddress } = await import(
      '@bhojan/location-v2/adapters/marketplaceAdapter'
    );
    const migrated = marketplaceLocationToV2(ready);
    assert.ok(migrated);
    const confirmed = {
      ...migrated,
      text: normalizeAddressText({
        ...migrated.text,
        flat: '402',
        shortLabel: '402, Koregaon Park',
      }),
    };
    persistMarketplaceAddress(confirmed);

    assert.equal(hasReadyDeliveryLocation(ready), true);
  });

  it('cart CTA opens confirmation when coords exist but flat is missing', () => {
    const cart = readFileSync(
      join(root, 'src/presentation/cart/OrderBhojanCartExperience.tsx'),
      'utf8',
    );
    assert.match(cart, /needsFlatConfirmation/);
    assert.match(cart, /openConfirmation/);
    assert.match(cart, /openSelector/);
    assert.doesNotMatch(cart, /openWizard/);
  });

  it('checkout flow requires ready delivery location', () => {
    const checkout = readFileSync(join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'), 'utf8');
    assert.match(checkout, /hasReadyDeliveryLocation\(activeLocation\)/);
    assert.match(checkout, /Confirm your flat or house number/);
  });
});
