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
    assert.match(chip, /Set your delivery area/);
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

  it('profile addresses tile opens unified location selector', () => {
    const profile = readFileSync(
      join(root, 'src/presentation/profile/OrderBhojanProfilePage.tsx'),
      'utf8',
    );

    assert.match(profile, /openSelector/);
    assert.doesNotMatch(profile, /AddressFormSheet/);
    assert.doesNotMatch(profile, /openWizard/);
  });

  it('v2ToSavedAddressInput maps flat/building into IndiaAddress street', async () => {
    const { v2ToSavedAddressInput } = await import(
      '../src/features/location/application/obLocationFlowService.ts'
    );
    const { normalizeAddressText } = await import('@bhojan/location-core');

    const input = v2ToSavedAddressInput({
      version: 2,
      coordinates: {
        lat: 18.5362,
        lng: 73.8958,
        source: 'gps',
        capturedAt: Date.now(),
      },
      text: normalizeAddressText({
        flat: '402',
        building: 'Green Valley',
        landmark: 'Near gate',
        formatted: 'Koregaon Park, Pune, Maharashtra 411001',
        shortLabel: 'Koregaon Park, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      }),
      meta: {
        provider: 'nominatim',
        precision: 'exact',
        capturedAt: Date.now(),
      },
    });

    assert.equal(input.address.street, '402, Green Valley');
    assert.equal(input.address.landmark, 'Near gate');
    assert.equal(input.address.pincode, '411001');
    // normalizeAddressText rebuilds formatted from flat/building/landmark when flat is set.
    assert.equal(input.address.formattedAddress, '402, Green Valley, Near gate, Pune');

    const shortFlat = v2ToSavedAddressInput({
      version: 2,
      coordinates: {
        lat: 18.5362,
        lng: 73.8958,
        source: 'gps',
        capturedAt: Date.now(),
      },
      text: normalizeAddressText({
        flat: '12',
        formatted: '12, Koregaon Park, Pune',
        shortLabel: 'Koregaon Park, Pune',
        city: 'Pune',
        state: 'Maharashtra',
        pincode: '411001',
      }),
      meta: {
        provider: 'nominatim',
        precision: 'exact',
        capturedAt: Date.now(),
      },
    });
    assert.ok(shortFlat.address.street.length >= 3);
    assert.match(shortFlat.address.street, /^12/);
  });

  it('resolveActiveDeliveryLocation returns null without confirmed location', async () => {
    const { resolveActiveDeliveryLocation, resolveActiveDeliveryCoords } = await import(
      '../src/features/location/domain/activeDeliveryLocation.ts'
    );
    const { resolveDeliveryCoords } = await import('../src/features/location/resolveDeliveryCoords.ts');

    assert.equal(resolveActiveDeliveryLocation(null), null);
    assert.equal(resolveActiveDeliveryCoords(null), null);
    assert.equal(resolveDeliveryCoords(null), null);
  });

  it('resolveActiveDeliveryLocation maps GPS to current mode and saved to selected', async () => {
    const { resolveActiveDeliveryLocation } = await import(
      '../src/features/location/domain/activeDeliveryLocation.ts'
    );

    const gps = resolveActiveDeliveryLocation({
      kind: 'session',
      displayLabel: 'Koregaon Park',
      coordinates: {
        lat: 18.5362,
        lng: 73.8958,
        source: 'gps',
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    assert.ok(gps);
    assert.equal(gps!.mode, 'current');
    assert.equal(gps!.coordinates.source, 'gps');
    assert.equal(gps!.isConfirmed, true);

    const selected = resolveActiveDeliveryLocation({
      kind: 'saved',
      displayLabel: 'Parents home, Hyderabad',
      savedAddressId: 'addr-1',
      coordinates: {
        lat: 17.44,
        lng: 78.35,
        source: 'map_pin',
        capturedAt: '2026-01-01T00:00:00.000Z',
      },
    });
    assert.ok(selected);
    assert.equal(selected!.mode, 'selected');
    assert.equal(selected!.coordinates.source, 'saved');
  });

  it('discovery does not fetch without confirmed coordinates', () => {
    const hook = readFileSync(
      join(root, 'src/features/discovery/hooks/useDiscoveryHome.ts'),
      'utf8',
    );
    assert.match(hook, /resolveActiveDeliveryCoords/);
    assert.match(hook, /enabled:\s*enabled && hasConfirmedCoords/);
  });

  it('AddressFormSheet does not default to Pune coordinates', () => {
    const form = readFileSync(join(root, 'src/features/location/ui/AddressFormSheet.tsx'), 'utf8');
    assert.doesNotMatch(form, /PUNE_COORDS/);
    assert.match(form, /Set a map pin or use current location before saving/);
  });

  it('OrderBhojanHomeLocationBar shows delivery mode context', () => {
    const bar = readFileSync(
      join(root, 'src/presentation/discovery/OrderBhojanHomeLocationBar.tsx'),
      'utf8',
    );
    assert.match(bar, /resolveActiveDeliveryLocation/);
    assert.match(bar, /Current location/);
    assert.match(bar, /Delivering to/);
  });
});
