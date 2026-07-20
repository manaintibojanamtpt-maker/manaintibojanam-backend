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



  it('hasReadyDeliveryLocation requires confirmed flat', async () => {

    const { hasReadyDeliveryLocation } = await import(

      '../src/features/location/domain/locationReadiness.ts'

    );

    const { normalizeAddressText, setLocationStoreAddress } = await import('@bhojan/location-core');



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

    assert.equal(hasReadyDeliveryLocation(coordsOnly), false);



    setLocationStoreAddress({

      version: 2,

      coordinates: {

        lat: 18.54,

        lng: 73.89,

        source: 'gps',

        capturedAt: Date.now(),

      },

      text: normalizeAddressText({

        flat: '402',

        formatted: '402, Koregaon Park',

        shortLabel: '402, Koregaon Park',

      }),

      meta: { provider: 'nominatim', precision: 'approx', capturedAt: Date.now() },

    });

    assert.equal(hasReadyDeliveryLocation(coordsOnly), true);

  });



  it('cart validation rejects checkout without active delivery location', () => {

    const validation = readFileSync(

      join(root, 'src/features/cart/hooks/useCartValidation.ts'),

      'utf8',

    );

    assert.match(validation, /hasActiveDeliveryLocation/);

    assert.match(validation, /hasReadyDeliveryLocation/);

    assert.doesNotMatch(validation, /resolveRestaurantCoords/);

    assert.match(validation, /Set your delivery location before checkout/);

    assert.match(validation, /Confirm your flat or house number/);

  });



  it('cart CTA opens selector or confirmation based on gate state', () => {

    const cart = readFileSync(

      join(root, 'src/presentation/cart/OrderBhojanCartExperience.tsx'),

      'utf8',

    );

    assert.match(cart, /hasActiveDeliveryLocation/);

    assert.match(cart, /needsFlatConfirmation/);

    assert.match(cart, /openConfirmation/);

    assert.match(cart, /openSelector/);

    assert.match(cart, /Set your delivery area/);

    assert.match(cart, /DELIVERY_LOCATION_GATE_MESSAGE/);

  });



  it('checkout readiness requires ready delivery location', () => {

    const checkout = readFileSync(join(root, 'src/features/checkout/hooks/useCheckoutFlow.ts'), 'utf8');

    assert.match(checkout, /hasReadyDeliveryLocation\(activeLocation\)/);

  });

});

