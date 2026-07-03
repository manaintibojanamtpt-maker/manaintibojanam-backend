/**
 * ReferenceSDK — bundle loader port (infrastructure injection).
 * Default implementation reads India JSON bundle from disk (Node).
 */

import type { IndiaReferenceBundle } from '../../../data/reference/india/schema';

export interface ReferenceBundlePort {
  load(): IndiaReferenceBundle;
}

export interface ReferenceBundleLoaderOptions {
  readonly port: ReferenceBundlePort;
}
