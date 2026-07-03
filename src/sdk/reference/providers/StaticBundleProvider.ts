/**
 * ReferenceSDK — static JSON bundle provider (M2 PR-5).
 * Loads India bundle, validates manifest + integrity, warms cache.
 */

import { assertValidIndiaReferenceBundle } from '../../../data/reference/india/integrity';
import type { IndiaReferenceBundle } from '../../../data/reference/india/schema';
import type { ReferenceBundlePort } from '../adapters/ReferenceBundlePort';
import {
  buildReferenceBundleIndex,
  clearReferenceBundleCache,
  getCachedReferenceBundleIndex,
  getCachedReferenceBundleVersion,
  setCachedReferenceBundleIndex,
  type ReferenceBundleIndex,
} from '../adapters/bundleCache';
import { assertValidReferenceBundleManifest } from '../adapters/validateManifest';

export class StaticBundleProvider {
  readonly kind = 'static_bundle' as const;

  private loadCount = 0;

  constructor(private readonly port: ReferenceBundlePort) {}

  /** Returns cached index; loads bundle at most once per cache lifecycle. */
  getIndex(): ReferenceBundleIndex {
    const cached = getCachedReferenceBundleIndex();
    if (cached) {
      return cached;
    }

    const bundle = this.loadAndValidate();
    const index = buildReferenceBundleIndex(bundle);
    setCachedReferenceBundleIndex(index, bundle.manifest.bundleVersion);
    return index;
  }

  getBundle(): IndiaReferenceBundle {
    return this.getIndex().bundle;
  }

  getLoadCount(): number {
    return this.loadCount;
  }

  private loadAndValidate(): IndiaReferenceBundle {
    this.loadCount += 1;
    const bundle = this.port.load();
    assertValidReferenceBundleManifest(bundle);
    assertValidIndiaReferenceBundle(bundle);
    return bundle;
  }
}

export function createStaticBundleProvider(port: ReferenceBundlePort): StaticBundleProvider {
  return new StaticBundleProvider(port);
}

export function resetStaticBundleProviderCache(): void {
  clearReferenceBundleCache();
}

export function getStaticBundleCacheVersion(): string | null {
  return getCachedReferenceBundleVersion();
}
