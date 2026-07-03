/**
 * DiscoverySDK factory — default adapter with injectable repository (M3 PR-3).
 */

import type { DiscoverySDK, DiscoverySDKFactory } from './contracts/DiscoverySDK';
import { createDefaultDiscoveryAdapter } from './adapters/DefaultDiscoveryAdapter';
import { createStubDiscoveryAdapter } from './adapters/StubDiscoveryAdapter';
import { resolveEligibilityEngine } from './eligibility/createEligibilityEngine';
import { resolveEligibilityEnabled } from './pipeline/resolvePipelineFlags';
import { resolveRankingEngine, resolveUseWeightedRanking } from './ranking/createRankingEngine';
import { createDiscoveryRepository } from './repository/createDiscoveryRepository';
import type { CreateDiscoverySDKOptions } from './shared/options';

export function createDiscoverySDK(options?: CreateDiscoverySDKOptions): DiscoverySDK {
  const eligibilityEngine = resolveEligibilityEngine(options);
  const rankingEngine = resolveRankingEngine(options);
  const useWeightedRanking = resolveUseWeightedRanking(options);
  const eligibilityEnabled = resolveEligibilityEnabled(options);

  const adapterDeps = {
    eligibilityEngine,
    rankingEngine,
    useWeightedRanking,
    eligibilityEnabled,
    pipelineHooks: options?.pipelineHooks,
  };

  if (options?.repository) {
    return createDefaultDiscoveryAdapter({ repository: options.repository, ...adapterDeps });
  }

  const providerKind = options?.providerKind ?? 'stub';
  if (providerKind === 'stub') {
    return createStubDiscoveryAdapter();
  }

  const repository = createDiscoveryRepository(options);
  return createDefaultDiscoveryAdapter({ repository, ...adapterDeps });
}

export const discoverySdkFactory: DiscoverySDKFactory = {
  create: (options?: CreateDiscoverySDKOptions) => createDiscoverySDK(options),
};

export { StubDiscoveryAdapter, createStubDiscoveryAdapter } from './adapters/StubDiscoveryAdapter';
export { DefaultDiscoveryAdapter, createDefaultDiscoveryAdapter } from './adapters/DefaultDiscoveryAdapter';
export { discoveryNotConfigured, discoveryNotConfiguredAsync } from './adapters/notConfigured';
export { createDiscoveryRepository, createDefaultTenantRepositoryPort } from './repository/createDiscoveryRepository';
