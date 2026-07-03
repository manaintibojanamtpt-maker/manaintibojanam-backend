/**
 * MenuSDK — orchestration factory (M7 PR-4).
 */

import type { MenuSDK } from '../contracts/MenuSDK';
import { createStubMenuAdapter } from '../adapters/StubMenuAdapter';
import { resolveMenuEnabled } from '../factory/createMenuSDK';
import { createMenuRepository } from '../repository/MenuRepositoryFactory';
import type { CreateMenuSDKOptions } from '../shared/options';
import { createDefaultMenuAdapter } from './DefaultMenuAdapter';

export function resolveMenuRepositoryEnabled(options?: CreateMenuSDKOptions): boolean {
  return (
    options?.menuRepository !== undefined ||
    options?.persistencePort !== undefined
  );
}

export function createOrchestratedMenuSDK(options: CreateMenuSDKOptions = {}): MenuSDK {
  if (options.menuSdk) {
    return options.menuSdk;
  }

  if (!resolveMenuEnabled(options)) {
    return createStubMenuAdapter();
  }

  const repository =
    options.menuRepository ??
    createMenuRepository({
      repository: options.menuRepository,
      persistencePort: options.persistencePort,
      featureFlags: options.featureFlags,
    });

  const repositoryEnabled = resolveMenuRepositoryEnabled(options);

  return createDefaultMenuAdapter({
    repository,
    repositoryEnabled,
    searchProvider: options.menuSearchProvider,
    onTelemetry: options.onTelemetry,
    syncCatalogResolver: options.syncCatalogResolver,
  });
}
