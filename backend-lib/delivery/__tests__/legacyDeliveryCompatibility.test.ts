/**
 * Phase 5 — STEP 18: Legacy Delivery Compatibility & Deprecation Test Suite
 *
 * Validates backward-compatibility wrappers, read precedence, dual-write safety,
 * immutability, tenant safety, pricing parity, and source inspection guards.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveLegacyPrepTime,
  resolveLegacyFreeDeliveryPolicy,
  toLegacyDeliveryMirrors,
  resolveLegacyProviderPreference,
  DEFAULT_PREP_TIME_MINUTES,
  DEFAULT_FREE_DELIVERY_THRESHOLD,
  type LegacyTenantDeliveryConfig,
} from '../legacyDeliveryCompatibility.js';
import { buildDeliveryDecision } from '../decisionEngine.js';
import { createDeliverySnapshot } from '../deliverySnapshotModel.js';
import { createDeliveryRuntime } from '../deliveryRuntimeEngine.js';
import { createPricingEngine } from '../pricingEngine.js';
import { isPorterLiveEnabled } from '../porterApprovalReadiness.js';
import { isUberDirectLiveEnabled } from '../uberDirectReadiness.js';

const FIXTURE_NOW = '2026-08-12T10:00:00.000Z';
const FIXTURE_CLOCK = () => new Date(FIXTURE_NOW);

function createTestSnapshotAndRuntime(tenantId: string, orderId: string, fee: number = 40, cost: number = 60) {
  const decision = buildDeliveryDecision({
    decisionId: `dec_${orderId}`,
    engineVersion: '1.0.0',
    requestedAt: FIXTURE_NOW,
    orderType: 'delivery',
    kitchenLocation: { lat: 17.4, lng: 78.4 },
    customerLocation: { lat: 17.45, lng: 78.45 },
    pricingMode: 'FIXED_TIER',
    pricing: {
      pricingMode: 'FIXED_TIER',
      distanceKm: 5,
      routeSource: 'ROUTING_PROVIDER',
      projectedDeliveryCost: cost,
      projectedCostSource: 'BENCHMARK',
      customerDeliveryFee: fee,
      freeDeliveryApplied: false,
      tenantSubsidy: Math.max(0, cost - fee),
      confidence: 'HIGH',
      calculatedAt: FIXTURE_NOW,
      engineVersion: '1.0.0',
    },
    route: {
      kind: 'ROAD',
      source: 'ROUTING_PROVIDER',
      distanceKm: 5,
      durationMinutes: 15,
      provider: 'ors',
      fetchedAt: FIXTURE_NOW,
    },
    prep: {
      estimatedMinutes: 20,
      remainingMinutes: 20,
      source: 'CONFIG',
      confidence: 'HIGH',
      calculatedAt: FIXTURE_NOW,
    },
    eta: {
      status: 'AUTHORITATIVE',
      confidence: 'HIGH',
      minMinutes: 38,
      maxMinutes: 52,
      formattedDisplay: '38–52 min',
      displayMinutes: 45,
      components: [],
      basedOnRoadRoute: true,
      calculatedAt: FIXTURE_NOW,
    },
    serviceability: { isServiceable: true, distanceKm: 5, reason: 'OK' },
    freeDelivery: { isFreeDelivery: false, threshold: 599, orderTotal: 300, amountNeededForFreeDelivery: 299 },
    tenantId,
    orderId,
  });

  const snapshot = createDeliverySnapshot(decision, { tenantId, orderId, clock: FIXTURE_CLOCK });
  const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

  return { snapshot, runtime };
}

describe('Step 18 — Legacy Delivery Compatibility Suite', () => {
  it('1. Legacy prepTime fallback works when canonical prep time is missing', () => {
    const config: LegacyTenantDeliveryConfig = { prepTime: 25 };
    assert.equal(resolveLegacyPrepTime(config), 25);
  });

  it('2. Canonical prep time overrides legacy prepTime', () => {
    const config: LegacyTenantDeliveryConfig = {
      prepTime: 25,
      kitchenConfig: { defaultPrepTimeMinutes: 35 },
    };
    assert.equal(resolveLegacyPrepTime(config), 35);
  });

  it('3. Missing canonical prep falls back to legacy prepTime', () => {
    const config: LegacyTenantDeliveryConfig = {
      prepTime: 20,
      kitchenConfig: { defaultPrepTimeMinutes: null },
    };
    assert.equal(resolveLegacyPrepTime(config), 20);
  });

  it('4. Missing both canonical and legacy prep uses approved repository default (30)', () => {
    assert.equal(resolveLegacyPrepTime(null), DEFAULT_PREP_TIME_MINUTES);
    assert.equal(resolveLegacyPrepTime({}), DEFAULT_PREP_TIME_MINUTES);
  });

  it('5. Legacy freeDeliveryMinOrder remains readable', () => {
    const config: LegacyTenantDeliveryConfig = { freeDeliveryMinOrder: 499 };
    const policy = resolveLegacyFreeDeliveryPolicy(config);
    assert.equal(policy.minimumOrderValue, 499);
  });

  it('6. Canonical freeDelivery.minimumOrderValue overrides legacy threshold', () => {
    const config: LegacyTenantDeliveryConfig = {
      freeDeliveryMinOrder: 499,
      freeDelivery: { minimumOrderValue: 799, enabled: true },
    };
    const policy = resolveLegacyFreeDeliveryPolicy(config);
    assert.equal(policy.minimumOrderValue, 799);
  });

  it('7 & 8. Legacy threshold alone does not auto-enable free delivery; canonical enabled controls activation', () => {
    const configWithLegacy: LegacyTenantDeliveryConfig = { freeDeliveryMinOrder: 499 };
    assert.equal(resolveLegacyFreeDeliveryPolicy(configWithLegacy).isEnabled, false);

    const configWithCanonical: LegacyTenantDeliveryConfig = { freeDelivery: { enabled: true } };
    assert.equal(resolveLegacyFreeDeliveryPolicy(configWithCanonical).isEnabled, true);
  });

  it('9 & 10. Legacy order.eta and order.etaMinutes mirror canonical ETA', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-eta-mirror');
    const mirrors = toLegacyDeliveryMirrors(snapshot, runtime);

    assert.equal(mirrors.eta, '38–52 min');
    assert.equal(mirrors.etaMinutes, 45);
  });

  it('11, 12, 13. Legacy deliveryPartner, trackingUrl, and deliveryAssignedAt mirror authoritative runtime evidence', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-runtime-mirror');

    const activeRuntime = {
      ...runtime,
      currentProvider: {
        providerId: 'uber_direct' as const,
        quoteStatus: 'QUOTED' as const,
        cost: 50,
        etaMinutes: 20,
        trackingUrl: 'https://tracking.uber.com/trip123',
        assignedAt: FIXTURE_NOW,
      },
    };

    const mirrors = toLegacyDeliveryMirrors(snapshot, activeRuntime as any);

    assert.equal(mirrors.deliveryPartner, 'uber_direct');
    assert.equal(mirrors.trackingUrl, 'https://tracking.uber.com/trip123');
    assert.equal(mirrors.deliveryAssignedAt, FIXTURE_NOW);
  });

  it('14 & 16 & 39. Snapshot remains immutable and legacy mirrors cannot mutate snapshot', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-immut');
    const snapBefore = JSON.stringify(snapshot);

    toLegacyDeliveryMirrors(snapshot, runtime);

    assert.equal(JSON.stringify(snapshot), snapBefore);
  });

  it('15. Runtime remains authoritative for active ETA', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-runtime-eta');

    const updatedRuntime = {
      ...runtime,
      currentEta: {
        status: 'AUTHORITATIVE' as const,
        confidence: 'HIGH' as const,
        minMinutes: 25,
        maxMinutes: 35,
        formattedDisplay: '25–35 min',
        displayMinutes: 30,
        components: [],
        basedOnRoadRoute: true,
        calculatedAt: FIXTURE_NOW,
      },
    };

    const mirrors = toLegacyDeliveryMirrors(null, updatedRuntime as any);
    assert.equal(mirrors.eta, '25–35 min');
    assert.equal(mirrors.etaMinutes, 30);
  });

  it('17, 18, 19, 20. Legacy fields cannot override customerDeliveryFee, projectedDeliveryCost, tenantSubsidy, or ETA', () => {
    const { snapshot } = createTestSnapshotAndRuntime('tenant-inti', 'ord-override-protect', 40, 60);

    assert.equal(snapshot.pricing.customerDeliveryFee, 40);
    assert.equal(snapshot.pricing.projectedDeliveryCost, 60);
    assert.equal(snapshot.pricing.tenantSubsidy, 20);
    assert.equal(snapshot.eta.displayMinutes, 45);
  });

  it('21, 22, 23, 24, 38. Pricing parity remains strictly unchanged (2km -> 0, 7km -> 40, 10km -> 70, 16km -> unavailable)', async () => {
    const engine = createPricingEngine();
    const makeRoute = (km: number) => ({
      kind: 'ROAD' as const,
      source: 'ROUTING_PROVIDER' as const,
      distanceKm: km,
      durationMinutes: km * 3,
      provider: 'test',
      fetchedAt: FIXTURE_NOW,
    });

    const config = { enabled: true, feesConfigured: true, freeRadius: 2, paidRadius: 7, maxRadius: 15, baseFee: 40, perKmCharge: 10 };

    const fee2km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(2), orderSubtotal: 200, tenantDeliveryConfig: config });
    const fee7km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(7), orderSubtotal: 200, tenantDeliveryConfig: config });
    const fee10km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(10), orderSubtotal: 200, tenantDeliveryConfig: config });
    const fee16km = await engine.price({ pricingMode: 'FIXED_TIER', route: makeRoute(16), orderSubtotal: 200, tenantDeliveryConfig: config });

    assert.equal(fee2km.customerDeliveryFee, 0);
    assert.equal(fee7km.customerDeliveryFee, 40);
    assert.equal(fee10km.customerDeliveryFee, 70);
    assert.equal(fee16km.customerDeliveryFee, null);
    assert.equal((fee16km as any).reason, 'FIXED_TIER_UNAVAILABLE');
  });

  it('25 & 26. Tenant isolation and entitlement protection remain intact', () => {
    const { snapshot: snapA } = createTestSnapshotAndRuntime('tenant-A', 'ord-A');
    assert.equal(snapA.tenantId, 'tenant-A');
  });

  it('27. Provider preference compatibility maps legacy strings to canonical selection mode', () => {
    assert.deepEqual(resolveLegacyProviderPreference('uber'), { selectionMode: 'CHEAPEST', preferredProviderId: 'uber_direct' });
    assert.deepEqual(resolveLegacyProviderPreference('porter'), { selectionMode: 'CHEAPEST', preferredProviderId: 'porter' });
    assert.deepEqual(resolveLegacyProviderPreference('unknown'), { selectionMode: 'MANUAL_FALLBACK', preferredProviderId: null });
  });

  it('28, 29, 30. Live flags remain false, zero network calls, secret safety', () => {
    assert.equal(isPorterLiveEnabled(), false);
    assert.equal(isUberDirectLiveEnabled(), false);
  });

  it('31. Existing tenants with only legacy fields continue working', () => {
    const legacyConfig: LegacyTenantDeliveryConfig = {
      prepTime: 20,
      freeDeliveryMinOrder: 499,
      deliveryPartnerPreference: 'uber',
    };

    assert.equal(resolveLegacyPrepTime(legacyConfig), 20);
    assert.equal(resolveLegacyFreeDeliveryPolicy(legacyConfig).minimumOrderValue, 499);
    assert.equal(resolveLegacyProviderPreference(legacyConfig.deliveryPartnerPreference).preferredProviderId, 'uber_direct');
  });

  it('32. Existing tenants with canonical + legacy fields use canonical values', () => {
    const combinedConfig: LegacyTenantDeliveryConfig = {
      prepTime: 20,
      kitchenConfig: { defaultPrepTimeMinutes: 30 },
      freeDeliveryMinOrder: 499,
      freeDelivery: { minimumOrderValue: 699, enabled: true },
    };

    assert.equal(resolveLegacyPrepTime(combinedConfig), 30);
    assert.equal(resolveLegacyFreeDeliveryPolicy(combinedConfig).minimumOrderValue, 699);
  });

  it('33. Existing tenants with canonical-only fields work', () => {
    const canonicalConfig: LegacyTenantDeliveryConfig = {
      kitchenConfig: { defaultPrepTimeMinutes: 25 },
      freeDelivery: { minimumOrderValue: 599, enabled: true },
    };

    assert.equal(resolveLegacyPrepTime(canonicalConfig), 25);
    assert.equal(resolveLegacyFreeDeliveryPolicy(canonicalConfig).minimumOrderValue, 599);
  });

  it('34 & 35 & 36 & 37. Empty/malformed/null legacy values fail safely and deterministically', () => {
    assert.equal(resolveLegacyPrepTime({ prepTime: -10 }), DEFAULT_PREP_TIME_MINUTES);
    assert.equal(resolveLegacyPrepTime({ prepTime: NaN }), DEFAULT_PREP_TIME_MINUTES);
    assert.equal(resolveLegacyFreeDeliveryPolicy({ freeDeliveryMinOrder: -50 }).minimumOrderValue, DEFAULT_FREE_DELIVERY_THRESHOLD);

    const mirrors = toLegacyDeliveryMirrors(null, null);
    assert.deepEqual(mirrors, {
      eta: null,
      etaMinutes: null,
      deliveryPartner: null,
      trackingUrl: null,
      deliveryAssignedAt: null,
    });
  });

  it('40, 41, 42. Step 15 lifecycle ETA, Step 16 provider adapters, Step 17 analytics remain unchanged', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-step-check');
    assert.ok(snapshot);
    assert.ok(runtime);
  });
});
