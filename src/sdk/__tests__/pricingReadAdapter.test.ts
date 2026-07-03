import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createPricingAdapterInfrastructure } from '../pricing/adapter/PricingAdapterFactory';
import {
  mapProjectionToPriceListDto,
  resolvePricingPriceListId,
} from '../pricing/adapter/mapProjectionToPricingDto';
import type {
  LegacyPricingReadPort,
  ProjectionPricingReadPort,
  PricingAdapterReadinessPort,
} from '../pricing/adapter/pricingAdapterPorts';
import type { PricingAdapterFeatureFlagReader } from '../pricing/adapter/pricingAdapterFeatureFlags';
import { PRICING_ADAPTER_FEATURE_FLAG_DEFAULTS } from '../pricing/adapter/pricingAdapterFeatureFlags';
import type { PricingAdapterTelemetryEvent } from '../pricing/adapter/PricingAdapterTelemetry';
import type { PriceResult } from '../pricing/dto';
import type { PricingCatalogProjectionReadModel } from '../../domain/pricing/projections/pricing/PricingProjectionState';
import type { TenantId } from '../core/types';
import type { MenuItemId, PriceListId } from '../pricing/types/branded';
import { sdkOk } from '../core/resultHelpers';

const tenantId = 'tenant-pricing-001' as TenantId;

const ADAPTER_ON: PricingAdapterFeatureFlagReader = () => true;
const ADAPTER_OFF: PricingAdapterFeatureFlagReader = () => false;

const legacyPriceList = (): PriceResult => ({
  unitPrice: { amount: 100, currency: 'INR' },
  totalPrice: { amount: 100, currency: 'INR' },
  priceListVersion: '1.0.0-legacy',
});

const legacyPrice = (): PriceResult => ({
  unitPrice: { amount: 80, currency: 'INR' },
  totalPrice: { amount: 80, currency: 'INR' },
  priceListVersion: '1.0.0-legacy',
});

const legacyEntries = (): PriceResult[] => [
  {
    unitPrice: { amount: 50, currency: 'INR' },
    totalPrice: { amount: 50, currency: 'INR' },
    priceListVersion: '1.0.0-legacy:1',
  },
];

const projectionCatalog = (): PricingCatalogProjectionReadModel => ({
  priceListId: 'tenant-pricing-001',
  tenantId: 'tenant-pricing-001',
  pricingVersion: '1.0.0',
  status: 'ACTIVE',
  priceCount: 42,
  couponCount: 3,
  campaignCount: 2,
  offerCount: 1,
  updatedAt: '2026-07-03T10:00:00.000Z',
  projectionVersion: '1.0.0',
});

const createLegacyRepo = (overrides: Partial<LegacyPricingReadPort> = {}): LegacyPricingReadPort => ({
  getPriceList: async () => sdkOk(legacyPriceList()),
  getPrice: async () => sdkOk(legacyPrice()),
  listPriceListEntries: async () => sdkOk(legacyEntries()),
  ...overrides,
});

const createProjectionRepo = (
  overrides: Partial<ProjectionPricingReadPort> = {}
): ProjectionPricingReadPort => ({
  getCatalog: async () => sdkOk(projectionCatalog()),
  getPriceListByTenant: async () => sdkOk(projectionCatalog()),
  isHealthy: async () => sdkOk(true),
  ...overrides,
});

const readinessReady = (): PricingAdapterReadinessPort => ({
  isProjectionReady: async () => sdkOk(true),
  isOperationalGreen: async () => sdkOk(true),
});

const readinessNotReady = (): PricingAdapterReadinessPort => ({
  isProjectionReady: async () => sdkOk(false),
  isOperationalGreen: async () => sdkOk(true),
});

const operationalNotGreen = (): PricingAdapterReadinessPort => ({
  isProjectionReady: async () => sdkOk(true),
  isOperationalGreen: async () => sdkOk(false),
});

describe('Pricing read adapter (M8 PR-11)', () => {
  it('defaults FF_PRICING_PROJECTION_ADAPTER_ENABLED to off', () => {
    assert.equal(
      PRICING_ADAPTER_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_ADAPTER_ENABLED,
      false
    );
  });

  it('mapProjectionToPriceListDto normalizes projection to PriceResult DTO', () => {
    const result = mapProjectionToPriceListDto(projectionCatalog(), { tenantId });
    assert.equal(result.priceListVersion, '1.0.0');
    assert.equal(result.unitPrice.amount, 0);
    assert.equal(result.totalPrice.currency, 'INR');
  });

  it('resolvePricingPriceListId uses tenant branch and price list', () => {
    assert.equal(resolvePricingPriceListId(tenantId), 'tenant-pricing-001');
    assert.equal(resolvePricingPriceListId(tenantId, 'branch-01'), 'tenant-pricing-001:branch-01');
    assert.equal(
      resolvePricingPriceListId(tenantId, undefined, 'pl-001' as PriceListId),
      'pl-001'
    );
  });

  it('routes to legacy when adapter flag off', async () => {
    let legacyReads = 0;
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_OFF,
      legacyRepository: createLegacyRepo({
        getPriceList: async () => {
          legacyReads += 1;
          return sdkOk(legacyPriceList());
        },
      }),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.getPriceList({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    const decision = await infra.adapter.resolveDecision();
    assert.equal(decision.ok, true);
    if (decision.ok) assert.equal(decision.value.source, 'legacy');
  });

  it('routes to projection when flag on and gates pass', async () => {
    const telemetry: PricingAdapterTelemetryEvent[] = [];
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getPriceList({ tenantId });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.priceListVersion, '1.0.0');
      assert.equal(result.value.unitPrice.amount, 0);
    }

    const decision = await infra.adapter.resolveDecision();
    assert.equal(decision.ok, true);
    if (decision.ok) assert.equal(decision.value.source, 'projection');

    assert.ok(telemetry.some((e) => e.type === 'pricing_adapter_projection_selected'));
    assert.ok(telemetry.some((e) => e.type === 'pricing_adapter_completed'));
  });

  it('falls back to legacy when projection not ready', async () => {
    const telemetry: PricingAdapterTelemetryEvent[] = [];
    let legacyReads = 0;
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getPriceList: async () => {
          legacyReads += 1;
          return sdkOk(legacyPriceList());
        },
      }),
      projectionRepository: createProjectionRepo(),
      readiness: readinessNotReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getPriceList({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    assert.ok(telemetry.some((e) => e.type === 'pricing_adapter_legacy_selected'));
  });

  it('falls back to legacy when operational not green', async () => {
    let legacyReads = 0;
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getPriceList: async () => {
          legacyReads += 1;
          return sdkOk(legacyPriceList());
        },
      }),
      projectionRepository: createProjectionRepo(),
      readiness: operationalNotGreen(),
    });

    const result = await infra.adapter.getPriceList({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
  });

  it('falls back to legacy when projection read fails', async () => {
    const telemetry: PricingAdapterTelemetryEvent[] = [];
    let legacyReads = 0;
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getPriceList: async () => {
          legacyReads += 1;
          return sdkOk(legacyPriceList());
        },
      }),
      projectionRepository: createProjectionRepo({
        getPriceListByTenant: async () => ({
          ok: false,
          error: { code: 'UNAVAILABLE', message: 'projection down' },
        }),
      }),
      readiness: readinessReady(),
      onTelemetry: (e) => telemetry.push(e),
    });

    const result = await infra.adapter.getPriceList({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
    assert.ok(telemetry.some((e) => e.type === 'pricing_adapter_fallback'));
  });

  it('falls back when projection repository unhealthy', async () => {
    const infra = createPricingAdapterInfrastructure({
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
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getPriceList: async () => {
          legacyReads += 1;
          return sdkOk(legacyPriceList());
        },
      }),
      projectionRepository: createProjectionRepo({
        getPriceListByTenant: async () => sdkOk(null),
      }),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.getPriceList({ tenantId });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
  });

  it('falls back on mapper failure', async () => {
    let legacyReads = 0;
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo({
        getPrice: async () => {
          legacyReads += 1;
          return sdkOk(legacyPrice());
        },
      }),
      projectionRepository: createProjectionRepo({
        getPriceListByTenant: async () => sdkOk({ ...projectionCatalog(), priceCount: 0 }),
      }),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.getPrice({
      tenantId,
      itemId: 'item-001' as MenuItemId,
    });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
  });

  it('getPrice validates tenantId', async () => {
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_OFF,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
    });

    const result = await infra.adapter.getPrice({
      tenantId: '' as TenantId,
      itemId: 'item-001' as MenuItemId,
    });
    assert.equal(result.ok, false);
    if (!result.ok) assert.equal(result.error.code, 'VALIDATION');
  });

  it('listPriceListEntries uses projection when selected', async () => {
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.listPriceListEntries({ tenantId });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.value.length, 42);
  });

  it('getPrice uses legacy when flag off', async () => {
    let legacyReads = 0;
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_OFF,
      legacyRepository: createLegacyRepo({
        getPrice: async () => {
          legacyReads += 1;
          return sdkOk(legacyPrice());
        },
      }),
      projectionRepository: createProjectionRepo(),
    });

    const result = await infra.adapter.getPrice({
      tenantId,
      itemId: 'item-001' as MenuItemId,
    });
    assert.equal(result.ok, true);
    assert.equal(legacyReads, 1);
  });

  it('createPricingAdapterInfrastructure exposes adapter and repositories', () => {
    const infra = createPricingAdapterInfrastructure({
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo(),
    });
    assert.ok(infra.adapter);
    assert.ok(infra.legacyRepository);
    assert.ok(infra.projectionRepository);
  });

  it('adapter never throws on unexpected projection failure', async () => {
    const infra = createPricingAdapterInfrastructure({
      featureFlags: ADAPTER_ON,
      legacyRepository: createLegacyRepo(),
      projectionRepository: createProjectionRepo({
        getPriceListByTenant: async () => {
          throw new Error('unexpected');
        },
      }),
      readiness: readinessReady(),
    });

    const result = await infra.adapter.getPriceList({ tenantId });
    assert.equal(result.ok, true);
  });
});
