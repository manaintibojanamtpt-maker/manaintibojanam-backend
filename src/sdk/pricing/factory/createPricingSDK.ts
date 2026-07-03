/**
 * PricingSDK factory (M8 PR-1 / M8 PR-4 orchestration).
 */

import type { PricingSDK, PricingSDKFactory } from '../contracts/PricingSDK';
import { createStubPricingAdapter } from '../adapters/StubPricingAdapter';
import {
  readPricingFlagDefault,
  type PricingFeatureFlagReader,
} from '../featureFlags/featureFlags';
import type { CreatePricingSDKOptions } from '../shared/options';
import { createOrchestratedPricingSDK } from '../orchestration/PricingSdkFactory';

export function resolvePricingEnabled(options?: CreatePricingSDKOptions): boolean {
  const readFlag: PricingFeatureFlagReader = options?.featureFlags ?? readPricingFlagDefault;
  return readFlag('FF_PRICING_ENABLED');
}

export function createPricingSDK(options: CreatePricingSDKOptions = {}): PricingSDK {
  return createOrchestratedPricingSDK(options);
}

export const pricingSdkFactory: PricingSDKFactory = {
  create: (options?: CreatePricingSDKOptions) => createPricingSDK(options),
};

export { StubPricingAdapter, createStubPricingAdapter } from '../adapters/StubPricingAdapter';
export {
  DefaultPricingAdapter,
  createDefaultPricingAdapter,
} from '../orchestration/DefaultPricingAdapter';
export {
  pricingNotConfigured,
  pricingNotConfiguredAsync,
  pricingNotConfiguredSync,
} from '../adapters/notConfigured';
