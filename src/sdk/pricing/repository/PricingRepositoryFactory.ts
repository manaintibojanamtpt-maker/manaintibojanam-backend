/**
 * PricingSDK — repository factory (M8 PR-3).
 * Standalone only — not wired into createPricingSDK().
 */

import { resolvePricingEnabled } from '../factory/createPricingSDK';
import type { PricingRepository } from '../contracts/ports';
import type { CreatePricingRepositoryOptions } from './PricingRepositoryPorts';
import { createPricingRepositoryAdapter } from './PricingRepositoryAdapter';
import { createStubPricingRepository } from './StubPricingRepository';

export function createPricingRepository(
  options: CreatePricingRepositoryOptions = {}
): PricingRepository {
  if (options.repository) {
    return options.repository;
  }

  const pricingEnabled = resolvePricingEnabled({ featureFlags: options.featureFlags });
  if (pricingEnabled && options.persistencePort) {
    return createPricingRepositoryAdapter(options.persistencePort);
  }

  return createStubPricingRepository();
}

export { createStubPricingRepository } from './StubPricingRepository';
export { createPricingRepositoryAdapter } from './PricingRepositoryAdapter';
