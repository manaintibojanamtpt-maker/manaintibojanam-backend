/**
 * ReferenceSDK — factory options (contracts only; no default implementation in PR-3).
 */

import type { ReferenceDataProviderKind } from '../types/branded';

export interface ReferenceSDKOptions {
  readonly providerKind?: ReferenceDataProviderKind;
}
