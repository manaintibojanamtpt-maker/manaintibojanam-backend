/**
 * LocationSDK — factory options (contracts only; no default implementation in PR-2).
 */

import type { LocationFeatureFlagReader } from '../core/featureFlags';

export interface LocationSDKOptions {
  readonly featureFlags?: LocationFeatureFlagReader;
}
