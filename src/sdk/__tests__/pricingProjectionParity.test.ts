import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  PRICING_SDK_FEATURE_FLAG_DEFAULTS,
  type PricingFeatureFlagReader,
} from '../pricing/featureFlags/featureFlags';
import {
  createPricingParityInfrastructure,
  InMemoryLegacyPricingReadPort,
  InMemoryProjectionPricingReadPort,
} from '../pricing/parity/PricingParityFactory';
import { createPricingParityMapper } from '../pricing/parity/PricingParityMapper';
import type { PricingParityTelemetryEvent } from '../pricing/parity/PricingParityTelemetry';
import type { LegacyPricingCatalogDocument } from '../../domain/pricing/parity/PricingCanonicalModel';
import type { PricingCatalogProjectionReadModel } from '../../domain/pricing/projections/pricing/PricingProjectionState';

const PARITY_FLAGS: PricingFeatureFlagReader = (flag) =>
  flag === 'FF_PRICING_PROJECTION_ENABLED' || flag === 'FF_PRICING_PROJECTION_PARITY_ENABLED';

const FIXED_CLOCK = { now: () => '2026-07-03T12:00:00.000Z' };
const FIXED_UUID = {
  generate: (() => {
    let n = 0;
    return () => `pricing-parity-${++n}`;
  })(),
};

const legacyCatalog = (): LegacyPricingCatalogDocument => ({
  priceListId: 'pricelist-parity-001',
  tenantId: 'tenant-parity-001',
  branchId: 'branch-parity-001',
  pricingVersion: '1.0.0',
  status: 'ACTIVE',
  priceCount: 42,
  couponCount: 3,
  campaignCount: 2,
  offerCount: 1,
  updatedAt: '2026-07-03T10:00:00.000Z',
});

const projectionCatalog = (
  overrides: Partial<PricingCatalogProjectionReadModel> = {}
): PricingCatalogProjectionReadModel => ({
  priceListId: 'pricelist-parity-001',
  tenantId: 'tenant-parity-001',
  branchId: 'branch-parity-001',
  pricingVersion: '1.0.0',
  status: 'ACTIVE',
  priceCount: 42,
  couponCount: 3,
  campaignCount: 2,
  offerCount: 1,
  updatedAt: '2026-07-03T10:00:00.000Z',
  projectionVersion: '1.0.0',
  ...overrides,
});

describe('Pricing catalog projection parity (M8 PR-8)', () => {
  it('defaults FF_PRICING_PROJECTION_PARITY_ENABLED to off', () => {
    assert.equal(
      PRICING_SDK_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_PARITY_ENABLED,
      false
    );
  });

  it('PricingParityComparator skips when flags are off', async () => {
    const legacyPort = new InMemoryLegacyPricingReadPort();
    legacyPort.seed(legacyCatalog());

    const infra = createPricingParityInfrastructure({
      legacyReadPort: legacyPort,
      projectionReadPort: new InMemoryProjectionPricingReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('pricelist-parity-001');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('requires both projection and parity flags', async () => {
    const projectionOnly: PricingFeatureFlagReader = (flag) =>
      flag === 'FF_PRICING_PROJECTION_ENABLED';

    const legacyPort = new InMemoryLegacyPricingReadPort();
    legacyPort.seed(legacyCatalog());

    const infra = createPricingParityInfrastructure({
      featureFlags: projectionOnly,
      legacyReadPort: legacyPort,
      projectionReadPort: new InMemoryProjectionPricingReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('pricelist-parity-001');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'NOT_CONFIGURED');
  });

  it('PricingParityMapper normalizes legacy and projection views', () => {
    const mapper = createPricingParityMapper();
    const legacy = mapper.mapLegacy(legacyCatalog());
    assert.equal(legacy.priceListId, 'pricelist-parity-001');
    assert.equal(legacy.status, 'ACTIVE');

    const projection = mapper.mapProjection(projectionCatalog({ status: 'active' }));
    assert.equal(projection.status, 'ACTIVE');
  });

  it('returns MISSING_IN_PROJECTION when legacy exists and projection is absent', async () => {
    const legacyPort = new InMemoryLegacyPricingReadPort();
    legacyPort.seed(legacyCatalog());

    const infra = createPricingParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: new InMemoryProjectionPricingReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('pricelist-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'MISSING_IN_PROJECTION');
  });

  it('returns MISSING_IN_LEGACY when projection exists and legacy is absent', async () => {
    const projectionPort = new InMemoryProjectionPricingReadPort();
    projectionPort.seed(projectionCatalog());

    const infra = createPricingParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: new InMemoryLegacyPricingReadPort(),
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('pricelist-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'MISSING_IN_LEGACY');
  });

  it('returns VERSION_MISMATCH when pricingVersion differs', async () => {
    const legacyPort = new InMemoryLegacyPricingReadPort();
    legacyPort.seed(legacyCatalog());
    const projectionPort = new InMemoryProjectionPricingReadPort();
    projectionPort.seed(projectionCatalog({ pricingVersion: '1.1.0' }));

    const infra = createPricingParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('pricelist-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'VERSION_MISMATCH');
  });

  it('returns FIELD_MISMATCH when price count differs', async () => {
    const legacyPort = new InMemoryLegacyPricingReadPort();
    legacyPort.seed(legacyCatalog());
    const projectionPort = new InMemoryProjectionPricingReadPort();
    projectionPort.seed(projectionCatalog({ priceCount: 50 }));

    const infra = createPricingParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('pricelist-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'FIELD_MISMATCH');
  });

  it('returns MATCH for aligned legacy and projection catalogs', async () => {
    const telemetry: PricingParityTelemetryEvent[] = [];
    const legacyPort = new InMemoryLegacyPricingReadPort();
    legacyPort.seed(legacyCatalog());
    const projectionPort = new InMemoryProjectionPricingReadPort();
    projectionPort.seed(projectionCatalog());

    const infra = createPricingParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
      onTelemetry: (event) => telemetry.push(event),
    });

    const result = await infra.compare('pricelist-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'MATCH');

    assert.ok(telemetry.some((event) => event.type === 'pricing_parity_started'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_parity_match'));
    assert.ok(telemetry.some((event) => event.type === 'pricing_parity_completed'));
  });

  it('compareAndReport persists report and updates statistics', async () => {
    const legacyPort = new InMemoryLegacyPricingReadPort();
    legacyPort.seed(legacyCatalog());
    const projectionPort = new InMemoryProjectionPricingReadPort();
    projectionPort.seed(projectionCatalog());

    const infra = createPricingParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: legacyPort,
      projectionReadPort: projectionPort,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const report = await infra.compareAndReport('pricelist-parity-001');
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
    const infra = createPricingParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      legacyReadPort: new InMemoryLegacyPricingReadPort(),
      projectionReadPort: new InMemoryProjectionPricingReadPort(),
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.compare('pricelist-parity-001');
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.outcome, 'UNSUPPORTED');
  });

  it('rejects empty priceListId validation', async () => {
    const infra = createPricingParityInfrastructure({
      featureFlags: PARITY_FLAGS,
      clock: FIXED_CLOCK,
      uuid: FIXED_UUID,
    });

    const result = await infra.validate('');
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION');
  });
});
