/**
 * PricingSDK — orchestration factory (M8 PR-4).
 */

import type { PricingSDK } from '../contracts/PricingSDK';
import { createStubPricingAdapter } from '../adapters/StubPricingAdapter';
import { resolvePricingEnabled } from '../factory/createPricingSDK';
import { createPricingRepository } from '../repository/PricingRepositoryFactory';
import type { CreatePricingSDKOptions } from '../shared/options';
import { createDefaultPricingAdapter } from './DefaultPricingAdapter';

export function resolvePricingRepositoryEnabled(options?: CreatePricingSDKOptions): boolean {
  return (
    options?.pricingRepository !== undefined || options?.persistencePort !== undefined
  );
}

export function createOrchestratedPricingSDK(
  options: CreatePricingSDKOptions = {}
): PricingSDK {
  if (options.pricingSdk) {
    return options.pricingSdk;
  }

  if (!resolvePricingEnabled(options)) {
    return createStubPricingAdapter();
  }

  const repository =
    options.pricingRepository ??
    createPricingRepository({
      repository: options.pricingRepository,
      persistencePort: options.persistencePort,
      featureFlags: options.featureFlags,
    });

  const repositoryEnabled = resolvePricingRepositoryEnabled(options);

  return createDefaultPricingAdapter({
    repository,
    repositoryEnabled,
    onTelemetry: options.onTelemetry,
  });
}
