/**
 * M2 PR-9 — Owner registration location reads (ReferenceSDK + LocationSDK facade).
 * Presentation must use this module — not direct SDK imports in components (ADR-011).
 */

import { createLocationSDK } from '../sdk/location/createLocationSDK';
import { createReferenceSDK } from '../sdk/reference/createReferenceSDK';
import type { LocationSDK } from '../sdk/location/contracts/LocationSDK';
import type { ReferenceSDK } from '../sdk/reference/contracts/ReferenceSDK';
import type { SdkAsyncResult, SdkResult } from '../sdk/core/result';
import { sdkError, sdkFail, sdkOk } from '../sdk/core/resultHelpers';
import type { AddressSearchResult } from '../sdk/location/dto/address';
import type { CountryId, StateId, DistrictId, CityId, LocalityId } from '../sdk/reference/types/branded';
import type { CanonicalLocation, OwnerAddressDraft, ReferenceSelectOption } from './ownerLocation/types';
import { mapCanonicalLocationToTenantLocation, type TenantLocationPayload } from './ownerLocation/tenantLocationMapper';
import { validateOwnerAddressDraft } from './ownerLocation/validateOwnerAddressDraft';

const INDIA_ISO = 'IN';

const mapEntity = (entry: { id: string; officialCode: string; displayName: string }): ReferenceSelectOption => ({
  id: entry.id,
  code: entry.officialCode,
  name: entry.displayName,
});

const propagate = <T>(result: SdkResult<unknown>): SdkResult<T> => {
  if (result.ok === false) {
    return sdkFail(result.error);
  }
  return sdkFail(sdkError('INTERNAL', 'Unexpected success while propagating SdkResult'));
};

export interface OwnerLocationServices {
  readonly reference: ReferenceSDK;
  readonly location: LocationSDK;
}

export function createOwnerLocationServices(): OwnerLocationServices {
  const reference = createReferenceSDK();
  return {
    reference,
    location: createLocationSDK({
      referenceSdk: reference,
      geocoding: 'nominatim',
    }),
  };
}

async function getIndiaCountryId(reference: ReferenceSDK): SdkAsyncResult<CountryId> {
  const countries = await reference.getCountries({ isoCode: INDIA_ISO });
  if (countries.ok === false) {
    return propagate(countries);
  }
  const india = countries.value[0];
  if (!india) {
    return sdkFail(sdkError('NOT_FOUND', 'India reference country not found'));
  }
  return sdkOk(india.id);
}

export async function listOwnerRegistrationStates(
  services: OwnerLocationServices = createOwnerLocationServices()
): SdkAsyncResult<ReferenceSelectOption[]> {
  const countryId = await getIndiaCountryId(services.reference);
  if (countryId.ok === false) {
    return countryId;
  }
  const states = await services.reference.getStates(countryId.value);
  if (states.ok === false) {
    return propagate(states);
  }
  return sdkOk(states.value.map(mapEntity));
}

export async function listOwnerRegistrationDistricts(
  stateId: StateId,
  services: OwnerLocationServices = createOwnerLocationServices()
): SdkAsyncResult<ReferenceSelectOption[]> {
  const districts = await services.reference.getDistricts(stateId);
  if (districts.ok === false) {
    return propagate(districts);
  }
  return sdkOk(districts.value.map(mapEntity));
}

export async function listOwnerRegistrationCities(
  districtId: DistrictId,
  services: OwnerLocationServices = createOwnerLocationServices()
): SdkAsyncResult<ReferenceSelectOption[]> {
  const cities = await services.reference.getCities(districtId);
  if (cities.ok === false) {
    return propagate(cities);
  }
  return sdkOk(cities.value.map(mapEntity));
}

export async function listOwnerRegistrationLocalities(
  cityId: CityId,
  services: OwnerLocationServices = createOwnerLocationServices()
): SdkAsyncResult<ReferenceSelectOption[]> {
  const localities = await services.reference.getLocalities(cityId);
  if (localities.ok === false) {
    return propagate(localities);
  }
  return sdkOk(localities.value.map(mapEntity));
}

export async function listOwnerRegistrationPincodes(
  localityId: LocalityId,
  services: OwnerLocationServices = createOwnerLocationServices()
): SdkAsyncResult<string[]> {
  const pincodes = await services.reference.getPincodes(localityId);
  if (pincodes.ok === false) {
    return propagate(pincodes);
  }
  return sdkOk(pincodes.value.map((entry) => entry.postalCode));
}

export async function searchOwnerRegistrationAddresses(
  query: string,
  services: OwnerLocationServices = createOwnerLocationServices()
): SdkAsyncResult<AddressSearchResult[]> {
  return services.location.searchAddress(query, { countryCode: 'IN', limit: 5 });
}

export async function resolveOwnerCanonicalLocation(
  draft: OwnerAddressDraft,
  services: OwnerLocationServices = createOwnerLocationServices()
): SdkAsyncResult<CanonicalLocation> {
  const validation = validateOwnerAddressDraft(draft);
  if (validation.ok === false) {
    return validation;
  }

  const geocoded = await services.location.forwardGeocode({
    structured: {
      country: 'IN',
      stateCode: draft.stateCode,
      stateName: draft.stateName,
      districtCode: draft.districtCode,
      districtName: draft.districtName,
      cityCode: draft.cityCode,
      cityName: draft.cityName,
      areaCode: draft.localityCode,
      areaName: draft.localityName,
      pincode: draft.pincode.trim(),
      street: draft.street.trim(),
      landmark: draft.landmark.trim() || undefined,
    },
  });

  if (geocoded.ok === false) {
    return geocoded;
  }

  const { point, geohash, formattedAddress } = geocoded.value;
  if (!Number.isFinite(point.lat) || !Number.isFinite(point.lng) || point.lat === 0 || point.lng === 0) {
    return sdkFail(sdkError('VALIDATION', 'Could not resolve coordinates for this address'));
  }
  if (!geohash?.trim()) {
    return sdkFail(sdkError('VALIDATION', 'Could not compute geohash for this address'));
  }

  return sdkOk({
    country: 'IN',
    stateCode: draft.stateCode,
    stateName: draft.stateName,
    districtCode: draft.districtCode,
    districtName: draft.districtName,
    cityCode: draft.cityCode,
    cityName: draft.cityName,
    localityCode: draft.localityCode,
    localityName: draft.localityName,
    pincode: draft.pincode.trim(),
    street: draft.street.trim(),
    landmark: draft.landmark.trim() || undefined,
    lat: point.lat,
    lng: point.lng,
    geohash,
    formattedAddress: formattedAddress || draft.street.trim(),
    coordinateSource: 'geocode',
  });
}

export async function buildOwnerLocationSavePayload(
  draft: OwnerAddressDraft,
  services: OwnerLocationServices = createOwnerLocationServices()
): SdkAsyncResult<TenantLocationPayload> {
  const canonical = await resolveOwnerCanonicalLocation(draft, services);
  if (canonical.ok === false) {
    return canonical;
  }
  return sdkOk(mapCanonicalLocationToTenantLocation(canonical.value, draft));
}

export type { CanonicalLocation, OwnerAddressDraft, ReferenceSelectOption, TenantLocationPayload };
export {
  mapCanonicalLocationToTenantLocation,
  hydrateOwnerAddressDraftFromTenant,
  canonicalLocationFromTenant,
} from './ownerLocation/tenantLocationMapper';
export { validateOwnerAddressDraft, isStructuredTenantLocationComplete } from './ownerLocation/validateOwnerAddressDraft';
