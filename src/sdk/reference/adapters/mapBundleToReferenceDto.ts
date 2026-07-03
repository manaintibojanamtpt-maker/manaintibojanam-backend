/**
 * ReferenceSDK — map India bundle entities to ReferenceSDK DTOs.
 */

import type {
  ReferenceBundleCity,
  ReferenceBundleCountry,
  ReferenceBundleDistrict,
  ReferenceBundleLocality,
  ReferenceBundlePincode,
  ReferenceBundleState,
} from '../../../data/reference/india/schema';
import type {
  ReferenceCity,
  ReferenceCountry,
  ReferenceDistrict,
  ReferenceLocality,
  ReferencePincode,
  ReferenceState,
} from '../dto/entities';
import type {
  CityId,
  CountryId,
  DistrictId,
  IsoCountryCode,
  LocalityId,
  PincodeId,
  StateId,
} from '../types/branded';

export function mapBundleCountry(entity: ReferenceBundleCountry): ReferenceCountry {
  return {
    id: entity.id as CountryId,
    officialCode: entity.officialCode,
    displayName: entity.displayName,
    parentId: null,
    active: entity.active,
    kind: 'country',
    isoCode: entity.isoCode as IsoCountryCode,
  };
}

export function mapBundleState(entity: ReferenceBundleState): ReferenceState {
  return {
    id: entity.id as StateId,
    officialCode: entity.officialCode,
    displayName: entity.displayName,
    parentId: entity.parentId as CountryId,
    active: entity.active,
    kind: 'state',
    administrationType: entity.administrationType,
  };
}

export function mapBundleDistrict(entity: ReferenceBundleDistrict): ReferenceDistrict {
  return {
    id: entity.id as DistrictId,
    officialCode: entity.officialCode,
    displayName: entity.displayName,
    parentId: entity.parentId as StateId,
    active: entity.active,
    kind: 'district',
  };
}

export function mapBundleCity(entity: ReferenceBundleCity): ReferenceCity {
  return {
    id: entity.id as CityId,
    officialCode: entity.officialCode,
    displayName: entity.displayName,
    parentId: entity.parentId as DistrictId,
    active: entity.active,
    kind: 'city',
  };
}

export function mapBundleLocality(entity: ReferenceBundleLocality): ReferenceLocality {
  return {
    id: entity.id as LocalityId,
    officialCode: entity.officialCode,
    displayName: entity.displayName,
    parentId: entity.parentId as CityId,
    active: entity.active,
    kind: 'locality',
  };
}

export function mapBundlePincode(entity: ReferenceBundlePincode): ReferencePincode {
  return {
    id: entity.id as PincodeId,
    officialCode: entity.officialCode,
    displayName: entity.displayName,
    parentId: entity.parentId as LocalityId,
    active: entity.active,
    kind: 'pincode',
    postalCode: entity.postalCode,
  };
}
