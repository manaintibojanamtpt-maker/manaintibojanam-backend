/**
 * M2 PR-9 — Owner address draft validation (presentation rules).
 */

import type { SdkResult } from '../../sdk/core/result';
import { sdkError, sdkFail, sdkOk } from '../../sdk/core/resultHelpers';
import type { OwnerAddressDraft } from './types';

const PINCODE_RE = /^\d{6}$/;

export function validateOwnerAddressDraft(draft: OwnerAddressDraft): SdkResult<OwnerAddressDraft> {
  if (!draft.stateId || !draft.stateCode || !draft.stateName.trim()) {
    return sdkFail(sdkError('VALIDATION', 'State is required', { field: 'state' }));
  }
  if (!draft.districtId || !draft.districtCode || !draft.districtName.trim()) {
    return sdkFail(sdkError('VALIDATION', 'District is required', { field: 'district' }));
  }
  if (!draft.cityId || !draft.cityCode || !draft.cityName.trim()) {
    return sdkFail(sdkError('VALIDATION', 'City is required', { field: 'city' }));
  }
  if (!draft.localityId || !draft.localityCode || !draft.localityName.trim()) {
    return sdkFail(sdkError('VALIDATION', 'Locality is required', { field: 'locality' }));
  }
  if (!PINCODE_RE.test(draft.pincode.trim())) {
    return sdkFail(sdkError('VALIDATION', 'Pincode must be a 6-digit number', { field: 'pincode' }));
  }
  if (!draft.street.trim() || draft.street.trim().length < 3) {
    return sdkFail(sdkError('VALIDATION', 'Street address is required (min 3 characters)', { field: 'street' }));
  }
  return sdkOk(draft);
}

export function isStructuredTenantLocationComplete(location?: {
  address?: string;
  city?: string;
  pincode?: string;
  lat?: number;
  lng?: number;
  geohash?: string;
  addressModel?: string;
}): boolean {
  if (!location || location.addressModel !== 'india_structured') {
    return false;
  }
  return (
    Boolean(location.address?.trim()) &&
    Boolean(location.city?.trim()) &&
    PINCODE_RE.test(String(location.pincode ?? '').trim()) &&
    Number.isFinite(location.lat) &&
    Number.isFinite(location.lng) &&
    location.lat !== 0 &&
    location.lng !== 0 &&
    Boolean(location.geohash?.trim())
  );
}
