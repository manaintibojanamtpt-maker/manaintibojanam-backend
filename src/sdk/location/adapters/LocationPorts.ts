/**
 * LocationSDK — dependency injection ports for adapter wiring (M2 PR-6).
 * No Firestore, Nominatim, browser, or MapLibre implementations here.
 */

import type { ReferenceSDK } from '../../reference/contracts/ReferenceSDK';
import type { LocationProvider } from '../providers/LocationProvider';
import type { LocationProviderRegistry } from '../providers/types';
import type { ReferenceProvider } from '../providers/ReferenceProvider';
import type { LocationRepository } from '../repository/LocationRepository';
import type { CreateLocationProviderRegistryOptions } from '../providers/types';

/** Runtime dependencies for DefaultLocationAdapter. */
export interface LocationAdapterDeps {
  readonly locationProvider: LocationProvider;
  readonly repository: LocationRepository;
  readonly referenceProvider: ReferenceProvider;
  readonly providerRegistry?: LocationProviderRegistry;
}

/** Optional overrides for createLocationSDK(). */
export interface CreateLocationSDKDeps extends CreateLocationProviderRegistryOptions {
  readonly locationProvider?: LocationProvider;
  readonly repository?: LocationRepository;
  readonly referenceProvider?: ReferenceProvider;
  readonly providerRegistry?: LocationProviderRegistry;
  /** When set, builds ReferenceSdkReferenceProvider unless referenceProvider is supplied. */
  readonly referenceSdk?: ReferenceSDK;
}
