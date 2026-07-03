/**
 * ReferenceSDK factory — static India bundle adapter (M2 PR-5).
 */

import type { ReferenceSDK, ReferenceSDKFactory } from './contracts/ReferenceSDK';
import { createReferenceBundleAdapter } from './adapters/ReferenceBundleAdapter';
import { createReferenceBundleRepository } from './adapters/ReferenceBundleRepository';
import type { ReferenceBundlePort } from './adapters/ReferenceBundlePort';
import { defaultReferenceBundlePort } from './adapters/defaultReferenceBundlePort';
import {
  createStaticBundleProvider,
  type StaticBundleProvider,
} from './providers/StaticBundleProvider';
import type { ReferenceSDKOptions } from './shared/options';

export function createReferenceSDK(
  port: ReferenceBundlePort = defaultReferenceBundlePort
): ReferenceSDK {
  const provider = createStaticBundleProvider(port);
  return createReferenceSDKFromProvider(provider);
}

/** Test / advanced wiring when reusing a provider instance. */
export function createReferenceSDKFromProvider(provider: StaticBundleProvider): ReferenceSDK {
  const repository = createReferenceBundleRepository(provider);
  return createReferenceBundleAdapter(repository);
}

export const referenceSdkFactory: ReferenceSDKFactory = {
  create: (options?: ReferenceSDKOptions) => {
    void options;
    return createReferenceSDK();
  },
};

export {
  clearReferenceBundleCache,
  getCachedReferenceBundleVersion,
} from './adapters/bundleCache';

export {
  resetStaticBundleProviderCache,
  getStaticBundleCacheVersion,
} from './providers/StaticBundleProvider';

export { defaultReferenceBundlePort } from './adapters/defaultReferenceBundlePort';
export type { ReferenceBundlePort } from './adapters/ReferenceBundlePort';
export { ReferenceBundleAdapter, createReferenceBundleAdapter } from './adapters/ReferenceBundleAdapter';
export {
  ReferenceBundleRepository,
  createReferenceBundleRepository,
} from './adapters/ReferenceBundleRepository';
export {
  StaticBundleProvider,
  createStaticBundleProvider,
} from './providers/StaticBundleProvider';
