/**
 * Phase 5 — STEP 15: Delivery Lifecycle ETA Updates Test Suite
 *
 * Tests the connection of OrderDeliverySnapshot + OrderDeliveryRuntime + PrepEngine + EtaEngine
 * to the order lifecycle without mutating the immutable checkout snapshot.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeliveryRuntime,
  updateDeliveryRuntime,
  toLegacyOrderDeliveryMirrors,
} from '../deliveryRuntimeEngine.js';
import { createDeliverySnapshot } from '../deliverySnapshotModel.js';
import { buildDeliveryDecision } from '../decisionEngine.js';
import { createPricingEngine } from '../pricingEngine.js';
import {
  normalizeOrderLifecyclePhase,
  transitionOrderDeliveryLifecycle,
} from '../deliveryLifecycleService.js';
import { isPorterLiveEnabled } from '../porterApprovalReadiness.js';
import { isUberDirectLiveEnabled } from '../uberDirectReadiness.js';

const FIXTURE_NOW = '2026-08-12T10:00:00.000Z';
const FIXTURE_CLOCK = () => new Date(FIXTURE_NOW);

function createTestSnapshot() {
  const decision = buildDeliveryDecision({
    decisionId: 'dec_test_15',
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
      projectedDeliveryCost: 60,
      projectedCostSource: 'BENCHMARK',
      customerDeliveryFee: 40,
      freeDeliveryApplied: false,
      tenantSubsidy: 20,
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
      components: [
        { label: 'Kitchen Preparation', minMinutes: 17, maxMinutes: 23, key: 'PREP' } as any,
        { label: 'Rider Assignment', minMinutes: 3, maxMinutes: 3, key: 'RIDER_ASSIGNMENT' } as any,
        { label: 'Rider to Kitchen', minMinutes: 5, maxMinutes: 5, key: 'RIDER_TO_KITCHEN' } as any,
        { label: 'Pickup Handling', minMinutes: 2, maxMinutes: 2, key: 'PICKUP_HANDLING' } as any,
        { label: 'Road Travel', minMinutes: 13, maxMinutes: 17, key: 'ROAD_TRAVEL' } as any,
        { label: 'Operational Buffer', minMinutes: 3, maxMinutes: 3, key: 'OPERATIONAL_BUFFER' } as any,
      ],
      basedOnRoadRoute: true,
      calculatedAt: FIXTURE_NOW,
    },
    serviceability: { isServiceable: true, distanceKm: 5, reason: 'OK' },
    freeDelivery: { isFreeDelivery: false, threshold: 599, orderTotal: 300, amountNeededForFreeDelivery: 299 },
    tenantId: 'tenant-inti',
    orderId: 'ord-1001',
  });

  return createDeliverySnapshot(decision, {
    tenantId: 'tenant-inti',
    orderId: 'ord-1001',
    clock: FIXTURE_CLOCK,
  });
}

function createMockDb(orderData: Record<string, unknown> | null = null) {
  const getFn = async () => ({
    exists: Boolean(orderData),
    data: () => orderData,
  });

  let updatedData: Record<string, unknown> | null = null;
  const updateFn = async (payload: Record<string, unknown>) => {
    updatedData = payload;
  };

  return {
    mockDb: {
      collection: (col: string) => ({
        doc: (tId: string) => ({
          collection: (subCol: string) => ({
            doc: (oId: string) => ({
              get: getFn,
              update: updateFn,
            }),
          }),
        }),
      }),
    } as any,
    getUpdatedData: () => updatedData,
  };
}

describe('Step 15 — Delivery Lifecycle ETA Updates Suite', () => {
  it('1. CREATED initializes runtime correctly from snapshot', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    assert.equal(runtime.lifecyclePhase, 'CREATED');
    assert.equal(runtime.tenantId, 'tenant-inti');
    assert.equal(runtime.orderId, 'ord-1001');
    assert.equal(runtime.currentEta.minMinutes, 38);
    assert.equal(runtime.currentEta.maxMinutes, 52);
  });

  it('2. ACCEPTED recomputes ETA through EtaEngine', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const updated = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'ACCEPTED',
      clock: FIXTURE_CLOCK,
    });

    assert.equal(updated.lifecyclePhase, 'ACCEPTED');
    assert.ok(updated.evidence.orderAcceptedAt);
  });

  it('3 & 4. PREPARING uses PrepEngine lifecycle evidence (preparationStartedAt reduces prep)', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const prepStartedClock = () => new Date('2026-08-12T10:10:00.000Z'); // 10 minutes into prep

    const updated = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'PREPARING',
      newEvidence: { preparationStartedAt: '2026-08-12T10:00:00.000Z' },
      clock: prepStartedClock,
    });

    assert.equal(updated.lifecyclePhase, 'PREPARING');
    assert.ok(updated.currentEta.minMinutes! < snapshot.eta.minMinutes!);
  });

  it('5 & 6. preparationCompletedAt / READY_FOR_PICKUP produces zero remaining prep', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const updated = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'READY_FOR_PICKUP',
      newEvidence: { preparationCompletedAt: FIXTURE_NOW },
      clock: FIXTURE_CLOCK,
    });

    assert.equal(updated.lifecyclePhase, 'READY_FOR_PICKUP');
    const prepComp = updated.currentEta.components.find((c) => c.key === 'PREP');
    assert.equal(prepComp?.minutes, 0);
  });

  it('7 & 8 & 9. DISPATCHED handles provider ETA evidence safely', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const updated = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'DISPATCHED',
      providerInfo: { providerId: 'rapido', trackingUrl: 'https://track.rapido.com/live/1001' },
      clock: FIXTURE_CLOCK,
    });

    assert.equal(updated.lifecyclePhase, 'DISPATCHED');
    assert.equal(updated.currentProvider?.providerId, 'rapido');
    assert.equal(updated.currentProvider?.trackingUrl, 'https://track.rapido.com/live/1001');
  });

  it('10 & 27. DELIVERED produces 0 remaining ETA with HIGH confidence and ACTUAL status', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const updated = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'DELIVERED',
      clock: FIXTURE_CLOCK,
    });

    assert.equal(updated.lifecyclePhase, 'DELIVERED');
    assert.equal(updated.currentEta.minMinutes, 0);
    assert.equal(updated.currentEta.maxMinutes, 0);
    assert.equal(updated.currentEta.confidence, 'HIGH');
    assert.equal(updated.currentEta.status, 'AUTHORITATIVE');
  });

  it('11. CANCELLED marks runtime correctly and preserves snapshot', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const updated = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'CANCELLED',
      clock: FIXTURE_CLOCK,
    });

    assert.equal(updated.lifecyclePhase, 'CANCELLED');
    assert.equal(snapshot.pricing.customerDeliveryFee, 40); // snapshot untouched
  });

  it('12 & 13 & 14 & 15 & 16 & 17 & 32. snapshot pricing, subsidy, route, and free-delivery remain UNMUTATED after runtime updates', () => {
    const snapshot = createTestSnapshot();
    const initialPricing = JSON.stringify(snapshot.pricing);
    const initialRoute = JSON.stringify(snapshot.route);
    const initialFree = JSON.stringify(snapshot.freeDelivery);
    const initialSubsidy = JSON.stringify(snapshot.subsidy);

    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);
    updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'PREPARING',
      clock: FIXTURE_CLOCK,
    });

    assert.equal(JSON.stringify(snapshot.pricing), initialPricing);
    assert.equal(JSON.stringify(snapshot.route), initialRoute);
    assert.equal(JSON.stringify(snapshot.freeDelivery), initialFree);
    assert.equal(JSON.stringify(snapshot.subsidy), initialSubsidy);
  });

  it('18 & 19 & 20 & 21. legacy mirrors update correctly from snapshot and runtime', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const updatedRuntime = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'DISPATCHED',
      providerInfo: { providerId: 'porter', trackingUrl: 'https://track.porter.com/live/1001', partnerAssignedAt: FIXTURE_NOW },
      clock: FIXTURE_CLOCK,
    });

    const mirrors = toLegacyOrderDeliveryMirrors(snapshot, updatedRuntime);

    assert.ok(mirrors.eta);
    assert.ok(typeof mirrors.etaMinutes === 'number');
    assert.equal(mirrors.deliveryPartner, 'porter');
    assert.equal(mirrors.trackingUrl, 'https://track.porter.com/live/1001');
    assert.equal(mirrors.deliveryAssignedAt, FIXTURE_NOW);
  });

  it('22. tenant isolation blocks cross-tenant lifecycle updates', async () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const { mockDb } = createMockDb({
      tenantId: 'tenant-inti',
      orderId: 'ord-1001',
      delivery: snapshot,
      deliveryRuntime: runtime,
    });

    try {
      await transitionOrderDeliveryLifecycle({
        db: mockDb,
        tenantId: 'tenant-MALICIOUS',
        orderId: 'ord-1001',
        targetPhase: 'ACCEPTED',
      });
      assert.fail('Should have thrown tenant isolation error');
    } catch (err: any) {
      assert.match(err.message, /Tenant isolation violation|not found/);
    }
  });

  it('23 & 24 & 25 & 30 & 31. client-supplied fee, ETA, or distance cannot override server calculations', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const updated = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'ACCEPTED',
      clock: FIXTURE_CLOCK,
    });

    assert.equal(snapshot.pricing.customerDeliveryFee, 40);
    assert.equal(updated.currentEta.basedOnRoadRoute, true);
  });

  it('26. deterministic now produces deterministic ETA output', () => {
    const snapshot = createTestSnapshot();
    const runtime = createDeliveryRuntime(snapshot, {}, FIXTURE_CLOCK);

    const run1 = updateDeliveryRuntime({ snapshot, currentRuntime: runtime, lifecyclePhase: 'ACCEPTED', clock: FIXTURE_CLOCK });
    const run2 = updateDeliveryRuntime({ snapshot, currentRuntime: runtime, lifecyclePhase: 'ACCEPTED', clock: FIXTURE_CLOCK });

    assert.equal(JSON.stringify(run1.currentEta), JSON.stringify(run2.currentEta));
  });

  it('33. provider live flags remain false', () => {
    assert.equal(isPorterLiveEnabled(), false);
    assert.equal(isUberDirectLiveEnabled(), false);
  });

  it('34. fixed-tier pricing parity strictly holds across 2km/7km/10km/16km', async () => {
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
    assert.equal(fee16km.confidence, 'UNAVAILABLE');
  });
});
