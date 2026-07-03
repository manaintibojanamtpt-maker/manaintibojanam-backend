/**
 * Browser-safe India reference bundle loader (static JSON imports).
 * Used by ReferenceSDK default port in the Vite frontend bundle.
 */

import manifest from './bundle/manifest.json';
import country from './bundle/country.json';
import states from './bundle/states.json';
import districts from './bundle/districts.json';
import cities from './bundle/cities.json';
import localities from './bundle/localities.json';
import pincodes from './bundle/pincodes.json';
import type { IndiaReferenceBundle } from './schema';
import { INDIA_REFERENCE_BUNDLE_VERSION } from './schema';

/** Load India reference bundle from bundled static JSON (browser + Vite). */
export function loadIndiaReferenceBundleStatic(): IndiaReferenceBundle {
  return {
    manifest,
    country,
    states,
    districts,
    cities,
    localities,
    pincodes,
  } as IndiaReferenceBundle;
}

export { INDIA_REFERENCE_BUNDLE_VERSION };
