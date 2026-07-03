import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { sdkOk } from '../../sdk/core/resultHelpers';
import type { LocationSDK } from '../../sdk/location/contracts/LocationSDK';
import type { ReferenceSDK } from '../../sdk/reference/contracts/ReferenceSDK';
import type { OwnerLocationServices } from '../ownerLocationReads';
import {
  buildOwnerLocationSavePayload,
  canonicalLocationFromTenant,
  hydrateOwnerAddressDraftFromTenant,
  listOwnerRegistrationStates,
  resolveOwnerCanonicalLocation,
} from '../ownerLocationReads';
import { mapCanonicalLocationToTenantLocation } from '../ownerLocation/tenantLocationMapper';
import type { OwnerAddressDraft } from '../ownerLocation/types';
import {
  isStructuredTenantLocationComplete,
  validateOwnerAddressDraft,
} from '../ownerLocation/validateOwnerAddressDraft';

const VALID_DRAFT: OwnerAddressDraft = {
  stateId: 'state-1',
  stateCode: 'MH',
  stateName: 'Maharashtra',
  districtId: 'dist-1',
  districtCode: 'PUN',
  districtName: 'Pune',
  cityId: 'city-1',
  cityCode: 'PNQ',
  cityName: 'Pune',
  localityId: 'loc-1',
  localityCode: 'FC',
  localityName: 'FC Road',
  pincode: '411005',
  street: '12 FC Road',
  landmark: 'Near Coffee House',
  searchQuery: '',
};

const createMockServices = (): OwnerLocationServices => {
  const reference = {
    getCountries: async () =>
      sdkOk([{ id: 'country-in', isoCode: 'IN', displayName: 'India', officialCode: 'IN' }]),
    getStates: async () =>
      sdkOk([{ id: 'state-1', displayName: 'Maharashtra', officialCode: 'MH', countryId: 'country-in' }]),
    getDistricts: async () => sdkOk([]),
    getCities: async () => sdkOk([]),
    getLocalities: async () => sdkOk([]),
    getPincodes: async () => sdkOk([]),
  } as unknown as ReferenceSDK;

  const location = {
    searchAddress: async () => sdkOk([]),
    forwardGeocode: async () =>
      sdkOk({
        point: { lat: 18.5204, lng: 73.8567 },
        geohash: 'tdr1w',
        formattedAddress: '12 FC Road, Pune, Maharashtra 411005, India',
      }),
    reverseGeocode: async () =>
      sdkOk({
        point: { lat: 0, lng: 0 },
        geohash: 'tdr1w',
        formattedAddress: 'Unknown',
      }),
    validateAddress: async () =>
      sdkOk({
        address: {} as never,
        geohash: 'tdr1w',
        geoJson: {} as never,
      }),
    detectCurrentLocation: async () =>
      sdkOk({
        lat: 0,
        lng: 0,
        accuracyM: 0,
        timestamp: Date.now(),
      }),
    calculateDistance: () => sdkOk({ distanceKm: 0, unit: 'km' as const }),
    encodeGeohash: () => sdkOk('tdr1w'),
    decodeGeohash: () => sdkOk({ lat: 0, lng: 0 }),
    findNearbyBranches: async () => sdkOk([]),
    findNearbyRestaurants: async () => sdkOk([]),
  } as unknown as LocationSDK;

  return { reference, location };
};

describe('Owner registration address intelligence (M2 PR-9)', () => {
  it('validateOwnerAddressDraft rejects incomplete hierarchy', () => {
    const result = validateOwnerAddressDraft({ ...VALID_DRAFT, stateId: '' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('validateOwnerAddressDraft rejects invalid pincode', () => {
    const result = validateOwnerAddressDraft({ ...VALID_DRAFT, pincode: '4110' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error.message, /Pincode/);
  });

  it('isStructuredTenantLocationComplete requires geohash and non-zero coordinates', () => {
    assert.equal(
      isStructuredTenantLocationComplete({
        addressModel: 'india_structured',
        address: '12 FC Road',
        city: 'Pune',
        pincode: '411005',
        lat: 18.52,
        lng: 73.85,
        geohash: 'tdr1w',
      }),
      true
    );
    assert.equal(
      isStructuredTenantLocationComplete({
        addressModel: 'india_structured',
        address: '12 FC Road',
        city: 'Pune',
        pincode: '411005',
        lat: 0,
        lng: 0,
        geohash: 'tdr1w',
      }),
      false
    );
  });

  it('mapCanonicalLocationToTenantLocation preserves legacy fields and reference ids', () => {
    const payload = mapCanonicalLocationToTenantLocation(
      {
        country: 'IN',
        stateCode: 'MH',
        stateName: 'Maharashtra',
        districtCode: 'PUN',
        districtName: 'Pune',
        cityCode: 'PNQ',
        cityName: 'Pune',
        localityCode: 'FC',
        localityName: 'FC Road',
        pincode: '411005',
        street: '12 FC Road',
        landmark: 'Near Coffee House',
        lat: 18.5204,
        lng: 73.8567,
        geohash: 'tdr1w',
        formattedAddress: '12 FC Road, Pune',
        coordinateSource: 'geocode',
      },
      VALID_DRAFT
    );

    assert.equal(payload.addressModel, 'india_structured');
    assert.equal(payload.address, '12 FC Road, Near Coffee House');
    assert.equal(payload.city, 'Pune');
    assert.equal(payload.geohash, 'tdr1w');
    assert.equal(payload.referenceStateId, 'state-1');
    assert.equal(payload.referenceLocalityId, 'loc-1');
  });

  it('hydrateOwnerAddressDraftFromTenant restores structured draft with reference ids', () => {
    const draft = hydrateOwnerAddressDraftFromTenant({
      addressModel: 'india_structured',
      address: '12 FC Road',
      city: 'Pune',
      state: 'Maharashtra',
      pincode: '411005',
      lat: 18.52,
      lng: 73.85,
      geohash: 'tdr1w',
      stateCode: 'MH',
      districtCode: 'PUN',
      districtName: 'Pune',
      cityCode: 'PNQ',
      localityCode: 'FC',
      localityName: 'FC Road',
      referenceStateId: 'state-1',
      referenceDistrictId: 'dist-1',
      referenceCityId: 'city-1',
      referenceLocalityId: 'loc-1',
    });

    assert.equal(draft.stateId, 'state-1');
    assert.equal(draft.localityId, 'loc-1');
    assert.equal(draft.street, '12 FC Road');
  });

  it('canonicalLocationFromTenant returns null for legacy location', () => {
    assert.equal(
      canonicalLocationFromTenant({
        address: 'Old address',
        city: 'Pune',
        lat: 1,
        lng: 2,
      }),
      null
    );
  });

  it('resolveOwnerCanonicalLocation geocodes validated draft via LocationSDK', async () => {
    const services = createMockServices();
    const result = await resolveOwnerCanonicalLocation(VALID_DRAFT, services);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.lat, 18.5204);
    assert.equal(result.value.geohash, 'tdr1w');
    assert.equal(result.value.coordinateSource, 'geocode');
  });

  it('buildOwnerLocationSavePayload returns tenant-compatible location payload', async () => {
    const services = createMockServices();
    const result = await buildOwnerLocationSavePayload(VALID_DRAFT, services);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.addressModel, 'india_structured');
    assert.equal(result.value.referenceCityId, 'city-1');
    assert.ok(result.value.lat !== 0);
  });

  it('listOwnerRegistrationStates returns India states from ReferenceSDK', async () => {
    const services = createMockServices();
    const result = await listOwnerRegistrationStates(services);

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.length, 1);
    assert.equal(result.value[0].code, 'MH');
  });
});
