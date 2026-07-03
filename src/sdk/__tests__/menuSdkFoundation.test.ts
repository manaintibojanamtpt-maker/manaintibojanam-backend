import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MENU_SDK_FEATURE_FLAG_DEFAULTS,
  MENU_SDK_FEATURE_FLAG_ENV_KEYS,
} from '../menu/featureFlags/featureFlags';
import { createMenuSDK, resolveMenuEnabled } from '../menu/factory/createMenuSDK';
import { createStubMenuAdapter } from '../menu/adapters/StubMenuAdapter';
import { createDefaultMenuAdapter } from '../menu/orchestration/DefaultMenuAdapter';
import { createStubMenuRepository } from '../menu/repository/StubMenuRepository';
import {
  MENU_SDK_FROZEN,
  MENU_SDK_MODULE,
  MENU_SDK_VERSION,
} from '../menu/version';
import {
  MENU_SDK_FROZEN as FROZEN_BARREL,
  MENU_SDK_MODULE as MODULE_BARREL,
  MENU_SDK_VERSION as VERSION_BARREL,
} from '../menu/types/index';
import type { MenuRepository } from '../menu/repository/MenuRepository';
import type { MenuProjectionRepository } from '../menu/repository/MenuProjectionRepository';
import type { MenuValidator } from '../menu/repository/MenuValidator';
import type { MenuSearchProvider } from '../menu/repository/MenuSearchProvider';
import type { MenuAvailabilityProvider } from '../menu/repository/MenuAvailabilityProvider';
import {
  validateMenuQuery,
  validateMenuItemQuery,
  validateMenuSearchQuery,
} from '../menu/validation/validateMenuQuery';
import type { TenantId } from '../core/types';
import type { MenuItemId } from '../menu/types/branded';

const tenantId = 'tenant-menu-001' as TenantId;
const itemId = 'item-001' as MenuItemId;

describe('MenuSDK foundation (M7 PR-1)', () => {
  it('exports MENU_SDK_VERSION as 1.0.0', () => {
    assert.equal(MENU_SDK_VERSION, '1.0.0');
    assert.equal(VERSION_BARREL, '1.0.0');
  });

  it('exports MENU_SDK_FROZEN as true', () => {
    assert.equal(MENU_SDK_FROZEN, true);
    assert.equal(FROZEN_BARREL, true);
  });

  it('exports MENU_SDK_MODULE as menu', () => {
    assert.equal(MENU_SDK_MODULE, 'menu');
    assert.equal(MODULE_BARREL, 'menu');
  });

  it('defaults all menu feature flags to off', () => {
    assert.equal(MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_ENABLED, false);
    assert.equal(MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_SEARCH_ENABLED, false);
    assert.equal(MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_ENABLED, false);
    assert.equal(MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_PARITY_ENABLED, false);
    assert.equal(MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_SOAK_ENABLED, false);
    assert.equal(
      MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_OPERATIONAL_VALIDATION_ENABLED,
      false
    );
  });

  it('maps feature flags to VITE env keys', () => {
    assert.equal(MENU_SDK_FEATURE_FLAG_ENV_KEYS.FF_MENU_ENABLED, 'VITE_FF_MENU_ENABLED');
    assert.equal(
      MENU_SDK_FEATURE_FLAG_ENV_KEYS.FF_MENU_SEARCH_ENABLED,
      'VITE_FF_MENU_SEARCH_ENABLED'
    );
    assert.equal(
      MENU_SDK_FEATURE_FLAG_ENV_KEYS.FF_MENU_PROJECTION_ENABLED,
      'VITE_FF_MENU_PROJECTION_ENABLED'
    );
    assert.equal(
      MENU_SDK_FEATURE_FLAG_ENV_KEYS.FF_MENU_PROJECTION_PARITY_ENABLED,
      'VITE_FF_MENU_PROJECTION_PARITY_ENABLED'
    );
    assert.equal(
      MENU_SDK_FEATURE_FLAG_ENV_KEYS.FF_MENU_PROJECTION_SOAK_ENABLED,
      'VITE_FF_MENU_PROJECTION_SOAK_ENABLED'
    );
    assert.equal(
      MENU_SDK_FEATURE_FLAG_ENV_KEYS.FF_MENU_OPERATIONAL_VALIDATION_ENABLED,
      'VITE_FF_MENU_OPERATIONAL_VALIDATION_ENABLED'
    );
  });

  it('resolveMenuEnabled is false with default flags', () => {
    assert.equal(resolveMenuEnabled(), false);
  });

  it('createMenuSDK returns stub adapter with NOT_CONFIGURED when flag off', async () => {
    const sdk = createMenuSDK();
    const result = await sdk.getMenu({ tenantId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createMenuSDK returns orchestrated UNAVAILABLE when flag on without repository', async () => {
    const sdk = createMenuSDK({ featureFlags: () => true });
    const result = await sdk.getMenuItem({ tenantId, itemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('StubMenuAdapter exposes NOT_CONFIGURED on all methods', async () => {
    const sdk = createStubMenuAdapter();
    const menu = await sdk.getMenu({ tenantId });
    assert.equal(menu.ok, false);

    const item = await sdk.getMenuItem({ tenantId, itemId });
    assert.equal(item.ok, false);

    const categories = await sdk.listCategories({ tenantId });
    assert.equal(categories.ok, false);

    const search = await sdk.searchMenu({ tenantId, text: 'thali' });
    assert.equal(search.ok, false);

    const groups = await sdk.getModifierGroups({
      tenantId,
      groupId: 'group-001' as import('../menu/types/branded').ModifierGroupId,
    });
    assert.equal(groups.ok, false);

    const combo = await sdk.getCombo({
      tenantId,
      comboId: 'combo-001' as import('../menu/types/branded').ComboId,
    });
    assert.equal(combo.ok, false);

    const validation = sdk.validateMenu({ tenantId });
    assert.equal(validation.ok, false);
  });

  it('DefaultMenuAdapter requires repository deps', async () => {
    const sdk = createDefaultMenuAdapter({
      repository: createStubMenuRepository(),
      repositoryEnabled: false,
    });
    const result = await sdk.searchMenu({ tenantId, text: 'biryani' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('validateMenuQuery rejects empty tenantId', () => {
    const result = validateMenuQuery({ tenantId: '' as TenantId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('validateMenuItemQuery accepts valid query', () => {
    const result = validateMenuItemQuery({ tenantId, itemId });
    assert.equal(result.ok, true);
  });

  it('validateMenuSearchQuery rejects empty text', () => {
    const result = validateMenuSearchQuery({ tenantId, text: '   ' });
    assert.equal(result.ok, false);
  });

  it('repository ports are interface-only shapes', () => {
    const repository: MenuRepository = {
      getMenu: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
      getMenuItem: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
      listCategories: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
      getCombo: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
    };
    const projection: MenuProjectionRepository = {
      getProjectedMenu: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
      getProjectedMenuItem: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
      isAvailable: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
    };
    const validator: MenuValidator = {
      validateMenu: () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
    };
    const search: MenuSearchProvider = {
      searchMenu: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
    };
    const availability: MenuAvailabilityProvider = {
      getAvailability: async () => ({ ok: false, error: { code: 'NOT_CONFIGURED', message: 'x' } }),
    };

    assert.equal(typeof repository.getMenu, 'function');
    assert.equal(typeof projection.isAvailable, 'function');
    assert.equal(typeof validator.validateMenu, 'function');
    assert.equal(typeof search.searchMenu, 'function');
    assert.equal(typeof availability.getAvailability, 'function');
  });
});
