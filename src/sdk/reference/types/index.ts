/**
 * ReferenceSDK — public type re-exports (barrel).
 */

export type {
  CountryId,
  StateId,
  DistrictId,
  CityId,
  LocalityId,
  PincodeId,
  IsoCountryCode,
  ReferenceDataProviderKind,
  StateAdministrationType,
  ReferenceEntityKind,
} from '../types/branded';

export type { ReferenceEntityBase } from '../dto/base';

export type {
  ReferenceCountry,
  ReferenceState,
  ReferenceDistrict,
  ReferenceCity,
  ReferenceLocality,
  ReferencePincode,
  ReferenceHierarchyPath,
} from '../dto/entities';

export type {
  ReferenceListFilter,
  ReferenceCountryListFilter,
  ReferenceChildListFilter,
  ReferenceLookupByCodeInput,
} from '../dto/filters';

export type { ReferenceSDK, ReferenceSDKFactory } from '../contracts/ReferenceSDK';

export type {
  ReferenceRepository,
  ReferenceRepositoryFactory,
} from '../repository/ReferenceRepository';

export type {
  ReferenceDataProvider,
  ReferenceDataProviderFactory,
  CreateReferenceDataProviderOptions,
} from '../providers/ReferenceDataProvider';

export type { ReferenceSdkErrorCode, ReferenceSdkErrorDetails } from '../errors/referenceErrors';

export type { ReferenceSDKOptions } from '../shared/options';

export {
  REFERENCE_SDK_VERSION,
  REFERENCE_SDK_FROZEN,
} from '../version';

export { REFERENCE_SDK_MODULE } from '../shared/constants';

export { createReferenceSDK, createReferenceSDKFromProvider, referenceSdkFactory } from '../createReferenceSDK';

export {
  clearReferenceBundleCache,
  getCachedReferenceBundleVersion,
  resetStaticBundleProviderCache,
  getStaticBundleCacheVersion,
  defaultReferenceBundlePort,
  ReferenceBundleAdapter,
  createReferenceBundleAdapter,
  ReferenceBundleRepository,
  createReferenceBundleRepository,
  StaticBundleProvider,
  createStaticBundleProvider,
} from '../createReferenceSDK';

export type { ReferenceBundlePort } from '../adapters/ReferenceBundlePort';
