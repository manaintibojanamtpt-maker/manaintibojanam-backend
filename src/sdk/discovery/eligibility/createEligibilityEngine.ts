/**
 * DiscoverySDK — eligibility engine factory (M3 PR-4).
 */

import {
  readDiscoveryFlagDefault,
  type DiscoveryFeatureFlagReader,
} from '../core/featureFlags';
import type { CreateDiscoverySDKOptions } from '../shared/options';
import { createDefaultEligibilityEngine } from './DefaultEligibilityEngine';
import type { EligibilityEngine } from './EligibilityEnginePort';

export function resolveEligibilityEngine(
  options?: CreateDiscoverySDKOptions
): EligibilityEngine | undefined {
  if (options?.eligibilityEngine) {
    return options.eligibilityEngine;
  }

  const readFlag: DiscoveryFeatureFlagReader =
    options?.featureFlags ?? readDiscoveryFlagDefault;

  if (!readFlag('FF_DISCOVERY_ELIGIBILITY_ENABLED')) {
    return undefined;
  }

  return createDefaultEligibilityEngine();
}
