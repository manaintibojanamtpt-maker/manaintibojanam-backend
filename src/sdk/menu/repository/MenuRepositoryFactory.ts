/**
 * MenuSDK — repository factory (M7 PR-3).
 */

import { resolveMenuEnabled } from '../factory/createMenuSDK';
import type { MenuRepository } from './MenuRepository';
import type { CreateMenuRepositoryOptions } from './MenuRepositoryPorts';
import { createMenuRepositoryAdapter } from './MenuRepositoryAdapter';
import { createStubMenuRepository } from './StubMenuRepository';

export function createMenuRepository(options: CreateMenuRepositoryOptions = {}): MenuRepository {
  if (options.repository) {
    return options.repository;
  }

  const menuEnabled = resolveMenuEnabled({ featureFlags: options.featureFlags });
  if (menuEnabled && options.persistencePort) {
    return createMenuRepositoryAdapter(options.persistencePort);
  }

  return createStubMenuRepository();
}

export { createStubMenuRepository } from './StubMenuRepository';
export { createMenuRepositoryAdapter } from './MenuRepositoryAdapter';
