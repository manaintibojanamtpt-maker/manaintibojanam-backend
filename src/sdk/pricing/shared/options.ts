/**
 * PricingSDK factory options (M8 PR-1 / M8 PR-4 orchestration).
 */

import type { PricingFeatureFlagReader } from '../featureFlags/featureFlags';
import type { PricingSDK } from '../contracts/PricingSDK';
import type { PricingRepository } from '../contracts/ports';
import type { PricingPersistencePort } from '../repository/PricingRepositoryPorts';
import type { PricingTelemetryHook } from '../orchestration/PricingTelemetry';

export interface CreatePricingSDKOptions {
  readonly featureFlags?: PricingFeatureFlagReader;
  readonly pricingSdk?: PricingSDK;
  readonly pricingRepository?: PricingRepository;
  readonly persistencePort?: PricingPersistencePort;
  readonly onTelemetry?: PricingTelemetryHook;
}
