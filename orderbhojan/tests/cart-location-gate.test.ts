import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('cart/checkout location gate (batch 1)', () => {
  it('hasActiveDeliveryLocation requires coordinates', async () => {
    const { hasActiveDeliveryLocation } = await import(
      '../src/features/location/domain/locationReadiness.ts'
    );

    assert.equal(hasActiveDeliveryLocation(null), false);
    assert.equal(hasActiveDeliveryLocation(undefined), false);
    assert.equal(
      hasActiveDeliveryLocation({
        kind: 'session',
        displayLabel: 'Koregaon Park',
        coordinates: { lat: 18.54, lng: 73.89, source: 'manual', capturedAt: '2026-01-01T00:00:00.000Z' },
      }),
      true,
    );
  });

  it('cart validation rejects checkout without active delivery location', () => {
    const validation = readFileSync(
      join(root, 'src/features/cart/hooks/useCartValidation.ts'),
      'utf8',
    );
    assert.match(validation, /hasActiveDeliveryLocation/);
    assert.doesNotMatch(validation, /resolveRestaurantCoords/);
    assert.match(validation, /Set your delivery location before checkout/);
  });

  it('cart CTA opens location wizard when delivery location is missing', () => {
    const cart = readFileSync(
      join(root, 'src/presentation/cart/OrderBhojanCartExperience.tsx'),
      'utf8',
    );
    assert.match(cart, /hasActiveDeliveryLocation/);
    assert.match(cart, /openWizard/);
    assert.match(cart, /Set delivery location/);
    assert.match(cart, /DELIVERY_LOCATION_GATE_MESSAGE/);
  });

  it('checkout readiness requires active delivery location', () => {
    const checkout = readFileSync(join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'), 'utf8');
    assert.match(checkout, /hasActiveDeliveryLocation\(activeLocation\)/);
  });
});
