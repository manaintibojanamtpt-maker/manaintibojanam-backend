import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  MENU_SDK_FEATURE_FLAG_DEFAULTS,
  type MenuFeatureFlagReader,
} from '../menu/featureFlags/featureFlags';
import {
  createMenuParityInfrastructure,
  InMemoryLegacyMenuReadPort,
  InMemoryProjectionMenuReadPort,
} from '../menu/parity/MenuParityFactory';
import { createMenuParityMapper } from '../menu/parity/MenuParityMapper';
import type { MenuParityTelemetryEvent } from '../menu/parity/MenuParityTelemetry';
import type { LegacyMenuCatalogDocument } from '../../domain/menu/parity/MenuCanonicalModel';
import type { MenuCatalogProjectionReadModel } from '../../domain/menu/projections/menu/MenuProjectionState';

const PARITY_FLAGS: MenuFeatureFlagReader = (flag) =>
  flag === 'FF_MENU_PROJECTION_ENABLED' || flag === 'FF_MENU_PROJECTION_PARITY_ENABLED';

const FIXED_CLOCK = { now: () => '2026-06-27T12:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `menu-parity-${++n}`;
  })(),
};

const legacyCatalog = (): LegacyMenuCatalogDocument => ({
  catalogId: 'catalog-parity-001',
  tenantId: 'tenant-parity-001',
  branchId: 'branch-parity-001',
  catalogVersion: '1.0.0',
  status: 'ACTIVE',
  categoryCount: 4,
  itemCount: 20,
  modifierGroupCount: 3,
  comboCount: 2,
  updatedAt: '2026-06-27T10:00:00.000Z',
});

const projectionCatalog = (
  overrides: Partial<MenuCatalogProjectionReadModel> = {}
): MenuCatalogProjectionReadModel => ({
  catalogId: 'catalog-parity-001',
  tenantId: 'tenant-parity-001',
  branchId: 'branch-parity-001',
  catalogVersion: '1.0.0',
  status: 'ACTIVE',
  categoryCount: 4,
  itemCount: 20,
  modifierGroupCount: 3,
  comboCount: 2,
  updatedAt: '2026-06-27T10:00:00.000Z',
  projectionVersion: '1.0.0',
  ...overrides,
});

describe('Menu catalog projection parity (M7 PR-8)', () => {
  it('defaults FF_MENU_PROJECTION_PARITY_ENABLED to off', () => {
    assert.equal(
      MENU_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_PARITY_ENABLED,
      false
    );
  });

  it('MenuParityComparator skips when flags are off', async () => {
    const legacyPort = new InMemoryLegacyMenuReadPort();
    legacyPort.seed(legacyCatalog());

    const infra = createMenuParityInfrastructure({
      legacyReadPort: legacyPort,
      projectionReadPort: new InMemoryProjectionMenuReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('catalog-parity-001');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('requires both projection and parity flags', async () => {
    const projectionOnly: MenuFeatureFlagReader = (flag) =>
      flag === 'FF_MENU_PROJECTION_ENABLED';

    const legacyPort = new InMemoryLegacyMenuReadPort();
    legacyPort.seed(legacyCatalog());

    const infra = createMenuParityInfrastructure({
      featureFlags: projectionOnly,
      legacyReadPort: legacyPort,
      projectionReadPort: new InMemoryProjectionMenuReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('catalog-parity-001');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('MenuParityMapper normalizes legacy and projection views', () => {
    const mapper = createMenuParityMapper();
    const legacy = mapper.mapLegacy(legacyCatalog());
    assert.equal(legacy.catalogId, 'catalog-parity-001');
    assert.equal(legacy.status, 'ACTIVE');

    const projection = mapper.mapProjection(projectionCatalog({ status: 'active' }));
    assert.equal(projection.status, 'ACTIVE');
  });

  it('returns MISSING_IN_PROJECTION when legacy exists and projection is absent', async () => {
    const legacyPort = new InMemoryLegacyMenuReadPort();
    legacyPort.seed(legacyCatalog());

    const infra = createMenuParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: new InMemoryProjectionMenuReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('catalog-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'MISSING_IN_PROJECTION');
  });

  it('returns MISSING_IN_LEGACY when projection exists and legacy is absent', async () => {
    const projectionPort = new InMemoryProjectionMenuReadPort();
    projectionPort.seed(projectionCatalog());

    const infra = createMenuParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: new InMemoryLegacyMenuReadPort(),
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('catalog-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'MISSING_IN_LEGACY');
  });

  it('returns VERSION_MISMATCH when catalogVersion differs', async () => {
    const legacyPort = new InMemoryLegacyMenuReadPort();
    legacyPort.seed(legacyCatalog());
    const projectionPort = new InMemoryProjectionMenuReadPort();
    projectionPort.seed(projectionCatalog({ catalogVersion: '1.1.0' }));

    const infra = createMenuParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('catalog-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'VERSION_MISMATCH');
  });

  it('returns FIELD_MISMATCH when item count differs', async () => {
    const legacyPort = new InMemoryLegacyMenuReadPort();
    legacyPort.seed(legacyCatalog());
    const projectionPort = new InMemoryProjectionMenuReadPort();
    projectionPort.seed(projectionCatalog({ itemCount: 25 }));

    const infra = createMenuParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('catalog-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'FIELD_MISMATCH');
  });

  it('returns MATCH for aligned legacy and projection catalogs', async () => {
    const telemetry: MenuParityTelemetryEvent[] = [];
    const legacyPort = new InMemoryLegacyMenuReadPort();
    legacyPort.seed(legacyCatalog());
    const projectionPort = new InMemoryProjectionMenuReadPort();
    projectionPort.seed(projectionCatalog());

    const infra = createMenuParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (event) => telemetry.push(event),
    });

    const result = await infra.compare('catalog-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'MATCH');

    assert.ok(telemetry.some((event) => event.type === 'menu_parity_started'));
    assert.ok(telemetry.some((event) => event.type === 'menu_parity_match'));
    assert.ok(telemetry.some((event) => event.type === 'menu_parity_completed'));
  });

  it('compareAndReport persists report and updates statistics', async () => {
    const legacyPort = new InMemoryLegacyMenuReadPort();
    legacyPort.seed(legacyCatalog());
    const projectionPort = new InMemoryProjectionMenuReadPort();
    projectionPort.seed(projectionCatalog());

    const infra = createMenuParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const report = await infra.compareAndReport('catalog-parity-001');
    assert.equal(report.ok, true);
    if (!report.ok) return;
    assert.equal(report.value.outcome, 'MATCH');

    const stats = await infra.statistics();
    assert.equal(stats.ok, true);
    if (!stats.ok) return;
    assert.equal(stats.value.totalCompared, 1);
    assert.equal(stats.value.matchPercent, 100);
    assert.equal(stats.value.averageComparisonDurationMs >= 0, true);
  });

  it('returns UNSUPPORTED when both sources are missing', async () => {
    const infra = createMenuParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: new InMemoryLegacyMenuReadPort(),
      projectionReadPort: new InMemoryProjectionMenuReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('catalog-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'UNSUPPORTED');
  });

  it('rejects empty catalogId validation', async () => {
    const infra = createMenuParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.validate('');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION');
  });
});
