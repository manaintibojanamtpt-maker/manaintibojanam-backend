/**
 * MenuSDK factory (M7 PR-1 / M7 PR-4 orchestration).
 */

import type { MenuSDK, MenuSDKFactory } from '../contracts/MenuSDK';
import { createStubMenuAdapter } from '../adapters/StubMenuAdapter';
import {
  readMenuFlagDefault,
  type MenuFeatureFlagReader,
} from '../featureFlags/featureFlags';
import type { CreateMenuSDKOptions } from '../shared/options';
import { createOrchestratedMenuSDK } from '../orchestration/MenuSdkFactory';

export function resolveMenuEnabled(options?: CreateMenuSDKOptions): boolean {
  const readFlag: MenuFeatureFlagReader = options?.featureFlags ?? readMenuFlagDefault;
  return readFlag('FF_MENU_ENABLED');
}

export function createMenuSDK(options: CreateMenuSDKOptions = {}): MenuSDK {
  return createOrchestratedMenuSDK(options);
}

export const menuSdkFactory: MenuSDKFactory = {
  create: (options?: CreateMenuSDKOptions) => createMenuSDK(options),
};

export { StubMenuAdapter, createStubMenuAdapter } from '../adapters/StubMenuAdapter';
export {
  DefaultMenuAdapter,
  createDefaultMenuAdapter,
} from '../orchestration/DefaultMenuAdapter';
export { menuNotConfigured, menuNotConfiguredAsync, menuNotConfiguredSync } from '../adapters/notConfigured';
