import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createMenuAdapterInfrastructure } from '../menu/adapter/MenuAdapterFactory';
import {
  mapProjectionToMenuDto,
  resolveMenuCatalogId,
} from '../menu/adapter/mapProjectionToMenuDto';
import type {
  LegacyMenuReadPort,
  ProjectionMenuReadPort,
  MenuAdapterReadinessPort,
} from '../menu/adapter/menuAdapterPorts';
import type { MenuAdapterFeatureFlagReader } from '../menu/adapter/menuAdapterFeatureFlags';
import { MENU_ADAPTER_FEATURE_FLAG_DEFAULTS } from '../menu/adapter/menuAdapterFeatureFlags';
import type { MenuAdapterTelemetryEvent } from '../menu/adapter/MenuAdapterTelemetry';
import type { Menu, MenuCategory, MenuItem, Combo } from '../menu/dto';
import type { MenuCatalogProjectionReadModel } from '../../domain/menu/projections/menu/MenuProjectionState';
import type { TenantId } from '../core/types';
import type { MenuItemId, ComboId, MenuId } from '../menu/types/branded';
import { sdkOk } from '../core/resultHelpers';

const tenantId = 'tenant-menu-001' as TenantId;

const ADAPTER_ON: MenuAdapterFeatureFlagReader = () => true;
const ADAPTER_OFF: MenuAdapterFeatureFlagReader = () => false;

const legacyMenu = (): Menu => ({
  menuId: 'menu-legacy-001' as MenuId,
  tenantId,
  name: 'Legacy Thali Menu',
  categories: [],
  items: [],
  metadata: {
    source: 'legacy',
    schemaVersion: '1.0.0',
    itemCount: 12,
    categoryCount: 3,
    generatedAt: '2026-06-27T10:00:00.000Z',
  },
  version: '1.0.0',
  updatedAt: '2026-06-27T10:00:00.000Z',
});

const legacyItem = (): MenuItem => ({
  itemId: 'item-001' as MenuItemId,
  name: 'Masala Dosa',
  kind: 'item',
  categoryId: 'cat-001',
  price: { amount: 80, currency: 'INR' },
  availability: { available: true },
  active: true,
});

const legacyCategories = (): MenuCategory[] => [
  {
    categoryId: 'cat-001' as import('../menu/types/branded').MenuCategoryId,
    name: 'Breakfast',
    sortOrder: 0,
    itemIds: ['item-001'],
    active: true,
  },
];

const legacyCombo = (): Combo => ({
  comboId: 'combo-001' as ComboId,
  name: 'Meal Combo',
  components: [],
  price: { amount: 150, currency: 'INR' },
  availability: { available: true },
  active: true,
});

const projectionCatalog = (): MenuCatalogProjectionReadModel => ({
  catalogId: 'tenant-menu-001',
  tenantId: 'tenant-menu-001',
  catalogVersion: '1.0.0',
  status: 'active',
  categoryCount: 3,
  itemCount: 12,
  modifierGroupCount: 2,
  comboCount: 1,
  updatedAt: '2026-06-27T10:00:00.000Z',
  projectionVersion: '1.0.0',
});

const createLegacyRepo = (overrides: Partial<LegacyMenuReadPort> = {}): LegacyMenuReadPort => ({
  getMenu: async () => sdkOk(legacyMenu()),
  getMenuItem: async () => sdkOk(legacyItem()),
  listCategories: async () => sdkOk(legacyCategories()),
  getCombo: async () => sdkOk(legacyCombo()),
  ...overrides,
});

const createProjectionRepo = (
  overrides: Partial<ProjectionMenuReadPort> = {}
): ProjectionMenuReadPort => ({
  getCatalog: async () => sdkOk(projectionCatalog()),
  getMenuByTenant: async () => sdkOk(projectionCatalog()),
  isHealthy: async () => sdkOk(true),
  ...overrides,
});

const readinessReady = (): MenuAdapterReadinessPort => ({
  isProjectionReady: async () => sdkOk(true),
  isOperationalGreen: async () => sdkOk(true),
});

const readinessNotReady = (): MenuAdapterReadinessPort => ({
  isProjectionReady: async () => sdkOk(false),
  isOperationalGreen: async () => sdkOk(true),
});

describe('Menu read adapter (M7 PR-11)', () => {
  it('defaults FF_MENU_PROJECTION_ADAPTER_ENABLED to off', () => {
    assert.equal(
      MENU_ADAPTER_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_ADAPTER_ENABLED,
      false
    );
  });

  it('mapProjectionToMenuDto normalizes projection to Menu DTO', () => {
    const menu = mapProjectionToMenuDto(projectionCatalog(), { tenantId });
    assert.equal(menu.menuId, 'tenant-menu-001');
    assert.equal(menu.metadata.source, 'projection');
    assert.equal(menu.metadata.itemCount, 12);
    assert.equal(menu.items.length, 0);
  });

  it('resolveMenuCatalogId uses tenant and branch', () => {
    assert.equal(resolveMenuCatalogId(tenantId), 'tenant-menu-001');
    assert.equal(resolveMenuCatalogId(tenantId, 'branch-01'), 'tenant-menu-001:branch-01');
  });

  it('routes to legacy when adapter flag off', async () => {
    let legacyReads = 0;
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_OFF,
      legacyRepository: createLegacyRepo({
        getMenu: async () => {
          legacyReads += 1;
          return sdkOk(legacyMenu());
        },
      }),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.getMenu({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    const decision = await infra.adapter.resolveDecision();
    assert.equal(decision.ok, true);
    if (decision.ok) assert.equal(decision.value.source, 'legacy');
  });

  it('routes to projection when flag on and gates pass', async () => {
    const telemetry: MenuAdapterTelemetryEvent[] = [];
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getMenu({ tenantId });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.metadata.source, 'projection');
      assert.equal(result.value.menuId, 'tenant-menu-001');
    }

    const decision = await infra.adapter.resolveDecision();
    assert.equal(decision.ok, true);
    if (decision.ok) assert.equal(decision.value.source, 'projection');

    assert.ok(telemetry.some((e) => e.type === 'menu_adapter_projection_selected'));
    assert.ok(telemetry.some((e) => e.type === 'menu_adapter_completed'));
  });

  it('falls back to legacy when projection not ready', async () => {
    const telemetry: MenuAdapterTelemetryEvent[] = [];
    let legacyReads = 0;
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getMenu: async () => {
          legacyReads += 1;
          return sdkOk(legacyMenu());
        },
      }),
      projectionRepository: createProjectionRepo(),
      readiness: readinessNotReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getMenu({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    assert.ok(telemetry.some((e) => e.type === 'menu_adapter_legacy_selected'));
  });

  it('falls back to legacy when projection read fails', async () => {
    const telemetry: MenuAdapterTelemetryEvent[] = [];
    let legacyReads = 0;
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getMenu: async () => {
          legacyReads += 1;
          return sdkOk(legacyMenu());
        },
      }),
      projectionRepository: createProjectionRepo({
        getMenuByTenant: async () => ({
          ok: false,
          error: { code: 'UNAVAILABLE', message: 'projection down' },
        }),
      }),
      readiness: readinessReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getMenu({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    assert.ok(telemetry.some((e) => e.type === 'menu_adapter_fallback'));
  });

  it('falls back when projection repository unhealthy', async () => {
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo({
        isHealthy: async () => sdkOk(false),
      }),
      readiness: readinessReady(),
    });

    const decision = await infra.adapter.resolveDecision();
    assert.equal(decision.ok, true);
    if (decision.ok) {
      assert.equal(decision.value.source, 'legacy');
      assert.equal(decision.value.fallback, true);
    }
  });

  it('falls back to legacy on projection NOT_FOUND', async () => {
    let legacyReads = 0;
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getMenu: async () => {
          legacyReads += 1;
          return sdkOk(legacyMenu());
        },
      }),
      projectionRepository: createProjectionRepo({
        getMenuByTenant: async () => sdkOk(null),
      }),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.getMenu({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
  });

  it('getMenuItem validates tenantId', async () => {
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_OFF,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
    });

    const result = await infra.adapter.getMenuItem({
      tenantId: '' as TenantId,
      itemId: 'item-001' as MenuItemId,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION');
  });

  it('listCategories uses projection when selected', async () => {
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.listCategories({ tenantId });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.length, 3);
  });

  it('getCombo uses legacy when flag off', async () => {
    let legacyReads = 0;
    const infra = createMenuAdapterInfrastructure({
      featureFlags: ADAPTER_OFF,
      legacyRepository: createLegacyRepo({
        getCombo: async (query) => {
          legacyReads += 1;
          return sdkOk(legacyCombo());
        },
      }),
      projectionRepository: createProjectionRepo(),
    });

    const result = await infra.adapter.getCombo({
      tenantId,
      comboId: 'combo-001' as ComboId,
    });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
  });

  it('createMenuAdapterInfrastructure exposes adapter and repositories', () => {
    const infra = createMenuAdapterInfrastructure({
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
    });
    assert.ok(infra.adapter);
    assert.ok(infra.legacyRepository);
    assert.ok(infra.projectionRepository);
  });
});
