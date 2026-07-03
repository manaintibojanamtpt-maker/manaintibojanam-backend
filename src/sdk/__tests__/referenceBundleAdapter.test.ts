import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import type { IndiaReferenceBundle } from '../../data/reference/india/schema';
import { INDIA_REFERENCE_BUNDLE_VERSION } from '../../data/reference/india/schema';
import {
  createReferenceSDK,
  createReferenceSDKFromProvider,
  resetStaticBundleProviderCache,
} from '../reference/createReferenceSDK';
import type { ReferenceBundlePort } from '../reference/adapters/ReferenceBundlePort';
import { createStaticBundleProvider } from '../reference/providers/StaticBundleProvider';
import type { CountryId, StateId, DistrictId, CityId } from '../reference/types/branded';

const mockBundle: IndiaReferenceBundle = {
  manifest: {
    bundleVersion: INDIA_REFERENCE_BUNDLE_VERSION,
    schemaVersion: 1,
    countryCode: 'IN',
    generatedAt: '2026-07-01',
    description: 'mock',
    entityCounts: {
      countries: 1,
      states: 1,
      districts: 1,
      cities: 1,
      localities: 1,
      pincodes: 1,
      aliasEntries: 1,
    },
  },
  country: {
    id: 'ref-country-in',
    officialCode: 'IN',
    displayName: 'India',
    parentId: null,
    active: true,
    kind: 'country',
    isoCode: 'IN',
  },
  states: [
    {
      id: 'ref-state-in-mh',
      officialCode: 'MH',
      displayName: 'Maharashtra',
      parentId: 'ref-country-in',
      active: true,
      kind: 'state',
      administrationType: 'state',
    },
  ],
  districts: [
    {
      id: 'ref-district-in-mh-pune',
      officialCode: 'MH-PU',
      displayName: 'Pune',
      parentId: 'ref-state-in-mh',
      active: true,
      kind: 'district',
    },
  ],
  cities: [
    {
      id: 'ref-city-in-mh-pune',
      officialCode: 'MH-PU-PUNE',
      displayName: 'Pune',
      parentId: 'ref-district-in-mh-pune',
      active: true,
      kind: 'city',
      aliases: ['Poona'],
    },
  ],
  localities: [
    {
      id: 'ref-locality-in-mh-pune-hinjewadi',
      officialCode: 'MH-PU-HJ',
      displayName: 'Hinjewadi',
      parentId: 'ref-city-in-mh-pune',
      active: true,
      kind: 'locality',
    },
  ],
  pincodes: [
    {
      id: 'ref-pincode-in-411057',
      officialCode: '411057',
      displayName: '411057',
      parentId: 'ref-locality-in-mh-pune-hinjewadi',
      active: true,
      kind: 'pincode',
      postalCode: '411057',
    },
  ],
};

function createMockPort(bundle: IndiaReferenceBundle = mockBundle): ReferenceBundlePort {
  return { load: () => bundle };
}

describe('ReferenceBundleAdapter (M2 PR-5)', () => {
  beforeEach(() => {
    resetStaticBundleProviderCache();
  });

  it('getCountries returns India', async () => {
    const sdk = createReferenceSDK(createMockPort());
    const result = await sdk.getCountries();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.length, 1);
      assert.equal(result.value[0].isoCode, 'IN');
    }
  });

  it('walks hierarchy country → pincode', async () => {
    const sdk = createReferenceSDK(createMockPort());
    const countryId = 'ref-country-in' as CountryId;

    const states = await sdk.getStates(countryId);
    assert.equal(states.ok, true);
    if (!states.ok) return;
    assert.equal(states.value.length, 1);
    assert.equal(states.value[0].officialCode, 'MH');

    const stateId = states.value[0].id;
    const districts = await sdk.getDistricts(stateId);
    assert.equal(districts.ok, true);
    if (!districts.ok) return;
    assert.equal(districts.value[0].displayName, 'Pune');

    const districtId = districts.value[0].id;
    const cities = await sdk.getCities(districtId);
    assert.equal(cities.ok, true);
    if (!cities.ok) return;

    const cityId = cities.value[0].id;
    const localities = await sdk.getLocalities(cityId);
    assert.equal(localities.ok, true);
    if (!localities.ok) return;
    assert.equal(localities.value[0].displayName, 'Hinjewadi');

    const localityId = localities.value[0].id;
    const pincodes = await sdk.getPincodes(localityId);
    assert.equal(pincodes.ok, true);
    if (pincodes.ok) {
      assert.equal(pincodes.value[0].postalCode, '411057');
    }
  });

  it('returns NOT_FOUND for unknown state', async () => {
    const sdk = createReferenceSDK(createMockPort());
    const result = await sdk.getDistricts('ref-state-in-missing' as StateId);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'NOT_FOUND');
    }
  });

  it('returns VALIDATION when countryId missing', async () => {
    const sdk = createReferenceSDK(createMockPort());
    const result = await sdk.getStates('' as CountryId);
    assert.equal(result.ok, false);
    if (!result.ok) {
      assert.equal(result.error.code, 'VALIDATION');
    }
  });

  it('applies limit filter on states', async () => {
    const multiStateBundle: IndiaReferenceBundle = {
      ...mockBundle,
      manifest: {
        ...mockBundle.manifest,
        entityCounts: { ...mockBundle.manifest.entityCounts, states: 2 },
      },
      states: [
        ...mockBundle.states,
        {
          id: 'ref-state-in-ka',
          officialCode: 'KA',
          displayName: 'Karnataka',
          parentId: 'ref-country-in',
          active: true,
          kind: 'state',
          administrationType: 'state',
        },
      ],
    };
    const sdk = createReferenceSDK(createMockPort(multiStateBundle));
    const result = await sdk.getStates('ref-country-in' as CountryId, { limit: 1 });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.length, 1);
    }
  });

  it('caches bundle after first load', () => {
    const port = createMockPort();
    let loadCalls = 0;
    const countingPort: ReferenceBundlePort = {
      load: () => {
        loadCalls += 1;
        return port.load();
      },
    };
    const provider = createStaticBundleProvider(countingPort);
    const sdk = createReferenceSDKFromProvider(provider);

    provider.getIndex();
    provider.getIndex();
    void sdk;

    assert.equal(loadCalls, 1);
    assert.equal(provider.getLoadCount(), 1);
  });
});

describe('ReferenceBundleAdapter — India bundle 2026.07 integration', () => {
  beforeEach(() => {
    resetStaticBundleProviderCache();
  });

  it('loads production bundle with 36 states', async () => {
    const { defaultReferenceBundlePort } = await import(
      '../reference/adapters/defaultReferenceBundlePort'
    );
    const sdk = createReferenceSDK(defaultReferenceBundlePort);
    const states = await sdk.getStates('ref-country-in' as CountryId);
    assert.equal(states.ok, true);
    if (states.ok) {
      assert.equal(states.value.length, 36);
    }
  });

  it('returns Bengaluru from Karnataka district path', async () => {
    const { defaultReferenceBundlePort } = await import(
      '../reference/adapters/defaultReferenceBundlePort'
    );
    const sdk = createReferenceSDK(defaultReferenceBundlePort);
    const kaDistricts = await sdk.getDistricts('ref-state-in-ka' as StateId);
    assert.equal(kaDistricts.ok, true);
    if (!kaDistricts.ok) return;

    const urban = kaDistricts.value.find((d) => d.officialCode === 'KA-BU');
    assert.ok(urban);

    const cities = await sdk.getCities(urban!.id as DistrictId);
    assert.equal(cities.ok, true);
    if (cities.ok) {
      const bengaluru = cities.value.find((c) => c.displayName === 'Bengaluru');
      assert.ok(bengaluru);
    }
  });
});
