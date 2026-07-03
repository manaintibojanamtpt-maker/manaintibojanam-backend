import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMenuSDK, resolveMenuEnabled } from '../menu/factory/createMenuSDK';
import { createOrchestratedMenuSDK } from '../menu/orchestration/MenuSdkFactory';
import { createDefaultMenuAdapter } from '../menu/orchestration/DefaultMenuAdapter';
import { createStubMenuRepository } from '../menu/repository/StubMenuRepository';
import type { MenuRepository } from '../menu/repository/MenuRepository';
import type { MenuSearchProvider } from '../menu/repository/MenuSearchProvider';
import type { MenuTelemetryEvent } from '../menu/orchestration/MenuTelemetry';
import { mapMenuDtoToDomainCatalog } from '../menu/orchestration/MenuDomainMapper';
import { mapRepositoryResultToSdk, mapDomainErrorToSdk } from '../menu/orchestration/MenuErrorMapper';
import { sdkError } from '../core/resultHelpers';
import type { TenantId } from '../core/types';
import type { ComboId, MenuId, MenuItemId } from '../menu/types/branded';
import type { Menu, MenuItem } from '../menu/dto';

const tenantId = 'tenant-orch-001' as TenantId;

const sampleMenu = (): Menu => ({
  menuId: 'menu-1' as MenuId,
  tenantId,
  name: 'Lunch Menu',
  categories: [
    {
      categoryId: 'cat-1' as import('../menu/types/branded').MenuCategoryId,
      name: 'Mains',
      sortOrder: 1,
      itemIds: ['item-1'],
      active: true,
    },
  ],
  items: [
    {
      itemId: 'item-1' as MenuItemId,
      name: 'Thali',
      kind: 'item',
      categoryId: 'cat-1',
      price: { amount: 120, currency: 'INR' },
      availability: { available: true },
      active: true,
    },
  ],
  metadata: {
    source: 'mock',
    schemaVersion: '1.0.0',
    itemCount: 1,
    categoryCount: 1,
    generatedAt: '2026-06-27T10:00:00.000Z',
  },
  version: '1.0.0',
  updatedAt: '2026-06-27T10:00:00.000Z',
});

const createMockMenuRepository = (
  overrides: Partial<MenuRepository> = {}
): MenuRepository => ({
  getMenu: async () => ({ ok: true, value: sampleMenu() }),
  getMenuItem: async () => ({ ok: true, value: sampleMenu().items[0]! }),
  listCategories: async () => ({ ok: true, value: [...sampleMenu().categories] }),
  getCombo: async () => ({
    ok: true,
    value: {
      comboId: 'combo-1' as ComboId,
      name: 'Family Pack',
      components: [{ itemId: 'item-1' as MenuItemId, quantity: 1 }],
      price: { amount: 220, currency: 'INR' },
      availability: { available: true },
      active: true,
    },
  }),
  ...overrides,
});

describe('Menu SDK orchestration (M7 PR-4)', () => {
  it('createMenuSDK returns stub when flag is off', async () => {
    const sdk = createMenuSDK();
    const result = await sdk.getMenu({ tenantId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('createMenuSDK uses injected MenuSDK first', async () => {
    const injected: MenuRepository = createMockMenuRepository();
    const sdk = createMenuSDK({
      menuSdk: createDefaultMenuAdapter({
        repository: injected,
        repositoryEnabled: true,
      }),
    });
    const result = await sdk.getMenu({ tenantId });
    assert.equal(result.ok, true);
  });

  it('orchestrated SDK returns UNAVAILABLE when flag on without repository injection', async () => {
    const sdk = createMenuSDK({ featureFlags: () => true });
    const result = await sdk.getMenu({ tenantId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('orchestrated SDK reads menu via mock repository', async () => {
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository(),
    });
    const result = await sdk.getMenu({ tenantId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.name, 'Lunch Menu');
  });

  it('orchestrated SDK returns NOT_FOUND from repository', async () => {
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository({
        getMenuItem: async () => ({
          ok: false,
          error: sdkError('NOT_FOUND', 'Item not found'),
        }),
      }),
    });
    const result = await sdk.getMenuItem({ tenantId, itemId: 'item-1' as MenuItemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_FOUND');
  });

  it('orchestrated SDK delegates search to search provider', async () => {
    const searchProvider: MenuSearchProvider = {
      searchMenu: async () => ({
        ok: true,
        value: {
          hits: [],
          categories: [],
          totalHits: 0,
          queryText: 'thali',
        },
      }),
    };
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository(),
      menuSearchProvider: searchProvider,
    });
    const result = await sdk.searchMenu({ tenantId, text: 'thali' });
    assert.equal(result.ok, true);
  });

  it('searchMenu returns NOT_CONFIGURED without search provider', async () => {
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository(),
    });
    const result = await sdk.searchMenu({ tenantId, text: 'thali' });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('getModifierGroups returns NOT_CONFIGURED', async () => {
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository(),
    });
    const result = await sdk.getModifierGroups({
      tenantId,
      groupId: 'group-1' as import('../menu/types/branded').ModifierGroupId,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('validateMenu uses sync catalog resolver and domain validator', () => {
    const menu = sampleMenu();
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository(),
      syncCatalogResolver: () => mapMenuDtoToDomainCatalog(menu),
    });
    const result = sdk.validateMenu({ tenantId });
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.valid, true);
  });

  it('validateMenu returns UNAVAILABLE without sync catalog resolver', () => {
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository(),
    });
    const result = sdk.validateMenu({ tenantId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });

  it('domain validation failure maps to SDK VALIDATION', async () => {
    const invalidItem: MenuItem = {
      ...sampleMenu().items[0]!,
      name: '  ',
    };
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository({
        getMenuItem: async () => ({ ok: true, value: invalidItem }),
      }),
    });
    const result = await sdk.getMenuItem({ tenantId, itemId: 'item-1' as MenuItemId });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'VALIDATION');
  });

  it('emits orchestration telemetry events', async () => {
    const events: MenuTelemetryEvent[] = [];
    const sdk = createOrchestratedMenuSDK({
      featureFlags: () => true,
      menuRepository: createMockMenuRepository(),
      onTelemetry: (event) => events.push(event),
    });
    await sdk.listCategories({ tenantId });
    assert.ok(events.some((event) => event.type === 'menu_request'));
    assert.ok(events.some((event) => event.type === 'repository_read'));
    assert.ok(events.some((event) => event.type === 'menu_success'));
  });

  it('mapRepositoryResultToSdk preserves NOT_FOUND', () => {
    const mapped = mapRepositoryResultToSdk({
      ok: false,
      error: sdkError('NOT_FOUND', 'missing'),
    });
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'NOT_FOUND');
  });

  it('mapDomainErrorToSdk maps to VALIDATION', () => {
    const mapped = mapDomainErrorToSdk({ code: 'EMPTY_NAME', message: 'Name required', field: 'name' });
    assert.equal(mapped.ok, false);
    if (mapped.ok) return;
    assert.equal(mapped.error.code, 'VALIDATION');
  });

  it('resolveMenuEnabled remains false by default', () => {
    assert.equal(resolveMenuEnabled(), false);
  });

  it('stub repository through orchestrator returns UNAVAILABLE when not enabled', async () => {
    const sdk = createDefaultMenuAdapter({
      repository: createStubMenuRepository(),
      repositoryEnabled: false,
    });
    const result = await sdk.getCombo({
      tenantId,
      comboId: 'combo-1' as ComboId,
    });
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.error.code, 'UNAVAILABLE');
  });
});
