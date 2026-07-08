import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

describe('M2 location intelligence module', () => {
  it('loads location CSS from main entry', () => {
    const main = readFileSync(join(root, 'src/main.tsx'), 'utf8');
    assert.match(main, /experience-location\.css/);
    statSync(join(root, 'src/styles/experience-location.css'));
  });

  it('has location feature module structure', () => {
    const files = [
      'src/features/location/domain/location.types.ts',
      'src/features/location/domain/location.schema.ts',
      'src/features/location/application/locationService.ts',
      'src/features/location/infrastructure/marketplaceLocationClient.ts',
      'src/features/location/infrastructure/firestoreAddressRepo.ts',
      'src/features/location/store/locationSessionStore.ts',
      'src/features/location/ui/LocationChip.tsx',
      'src/features/location/ui/LocationSelectorSheet.tsx',
    ];
    for (const file of files) {
      statSync(join(root, file));
    }
  });

  it('location flags default OFF', () => {
    const flags = readFileSync(join(root, 'src/featureFlags/flags.ts'), 'utf8');
    assert.match(flags, /FF_LOCATION_ENABLED: false/);
    assert.match(flags, /FF_LOCATION_GEOCODE_API: false/);
    assert.match(flags, /FF_LOCATION_MAP_ENABLED: false/);
  });

  it('HeroHeader integrates LocationChip behind feature flag', () => {
    const header = readFileSync(join(root, 'src/features/experience/ui/home/HeroHeader.tsx'), 'utf8');
    assert.match(header, /useLocationFeatureEnabled/);
    assert.match(header, /LocationChip/);
  });

  it('location module does not import discover or checkout', () => {
    const service = readFileSync(join(root, 'src/features/location/application/locationService.ts'), 'utf8');
    assert.doesNotMatch(service, /discover\(/);
    assert.doesNotMatch(service, /checkout/);
    assert.doesNotMatch(service, /nominatim/i);
  });

  it('MSW handlers include location endpoints', () => {
    const handlers = readFileSync(join(root, 'src/marketplace-api/mocks/handlers.ts'), 'utf8');
    assert.match(handlers, /location\/reverse/);
    assert.match(handlers, /location\/serviceability/);
    assert.match(handlers, /location\/validate-pincode/);
  });

  it('location CSS includes safe-area and reduced motion', () => {
    const css = readFileSync(join(root, 'src/styles/experience-location.css'), 'utf8');
    assert.match(css, /safe-area-inset-bottom/);
    assert.match(css, /prefers-reduced-motion/);
    assert.match(css, /--bds-/);
  });
});

describe('M2 domain validation', () => {
  it('validates India pincode schema', async () => {
    const { indiaAddressSchema } = await import('../src/features/location/domain/location.schema.ts');
    const result = indiaAddressSchema.safeParse({
      country: 'IN',
      stateCode: 'TS',
      stateName: 'Telangana',
      districtCode: 'TS-HYD',
      districtName: 'Hyderabad',
      cityCode: 'hyderabad',
      cityName: 'Hyderabad',
      areaCode: 'gachibowli',
      areaName: 'Gachibowli',
      pincode: '500032',
      street: 'Plot 12',
      coordinates: {
        lat: 17.44,
        lng: 78.35,
        source: 'gps',
        capturedAt: new Date().toISOString(),
      },
    });
    assert.equal(result.success, true);
  });

  it('rejects invalid pincode', async () => {
    const { indiaAddressSchema } = await import('../src/features/location/domain/location.schema.ts');
    const result = indiaAddressSchema.safeParse({
      country: 'IN',
      stateCode: 'TS',
      stateName: 'Telangana',
      districtCode: 'TS-HYD',
      districtName: 'Hyderabad',
      cityCode: 'hyderabad',
      cityName: 'Hyderabad',
      areaCode: 'gachibowli',
      areaName: 'Gachibowli',
      pincode: '123',
      street: 'Plot 12',
      coordinates: {
        lat: 17.44,
        lng: 78.35,
        source: 'gps',
        capturedAt: new Date().toISOString(),
      },
    });
    assert.equal(result.success, false);
  });
});

describe('M2 reference data', () => {
  it('lists Indian states', async () => {
    const { listStates, validatePincodeForArea } = await import('../src/features/location/data/india/reference.ts');
    assert.ok(listStates().length >= 4);
    assert.equal(validatePincodeForArea('gachibowli', '500032'), true);
  });

  it('cascades district, city, area, and pincode when state changes', async () => {
    const {
      cascadeFromState,
      cascadeFromDistrict,
      inferCascadeFromDisplayLabel,
      DEFAULT_ADDRESS_CASCADE,
    } = await import('../src/features/location/data/india/reference.ts');

    const mh = cascadeFromState('MH');
    assert.equal(mh.stateCode, 'MH');
    assert.equal(mh.districtCode, 'MH-PUN');
    assert.equal(mh.cityCode, 'pune');
    assert.equal(mh.areaCode, 'koregaon-park');
    assert.equal(mh.pincode, '411001');

    const puneBaner = cascadeFromDistrict('MH', 'MH-PUN');
    assert.equal(puneBaner.cityCode, 'pune');
    assert.notEqual(puneBaner.areaCode, 'gachibowli');

    const inferred = inferCascadeFromDisplayLabel('Koregaon Park, Pune');
    assert.equal(inferred?.areaCode, 'koregaon-park');
    assert.equal(inferred?.stateCode, 'MH');

    assert.equal(DEFAULT_ADDRESS_CASCADE.cityCode, 'pune');
  });
});
