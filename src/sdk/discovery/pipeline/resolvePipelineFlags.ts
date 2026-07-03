/**
 * DiscoverySDK — pipeline feature flag resolution (M3 PR-6).
 */

import {
  readDiscoveryFlagDefault,
  type DiscoveryFeatureFlagReader,
} from '../core/featureFlags';
import type { CreateDiscoverySDKOptions } from '../shared/options';

export function resolveEligibilityEnabled(
  options?: CreateDiscoverySDKOptions
): boolean {
  const readFlag: DiscoveryFeatureFlagReader =
    options?.featureFlags ?? readDiscoveryFlagDefault;

  return readFlag('FF_DISCOVERY_ELIGIBILITY_ENABLED');
}
