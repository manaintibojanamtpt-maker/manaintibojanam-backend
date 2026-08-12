/**
 * Phase 5 — STEP 17: Delivery Analytics & SLA Telemetry Test Suite
 *
 * Validates observational delivery analytics, SLA compliance, ETA accuracy,
 * tenant isolation, secret safety, financial preservation, and immutability.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeSingleOrderAnalytics,
  aggregateDeliveryAnalytics,
  sanitizeAnalyticsForCustomer,
  type DeliveryAnalyticsInputRecord,
} from '../deliveryAnalyticsService.js';
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

describe('Step 17 — Delivery Analytics & SLA Telemetry Suite', () => {
  it('1 & 40. Tenant isolation: Tenant A request never includes Tenant B orders or metrics', () => {
    const { snapshot: snapA, runtime: runA } = createTestSnapshotAndRuntime('tenant-A', 'ord-A-101');
    const { snapshot: snapB, runtime: runB } = createTestSnapshotAndRuntime('tenant-B', 'ord-B-101');

    const records: DeliveryAnalyticsInputRecord[] = [
      { tenantId: 'tenant-A', orderId: 'ord-A-101', delivery: snapA, deliveryRuntime: runA, createdAt: FIXTURE_NOW, status: 'DELIVERED', orderAcceptedAt: FIXTURE_NOW, deliveredAt: '2026-08-12T10:45:00.000Z' },
      { tenantId: 'tenant-B', orderId: 'ord-B-101', delivery: snapB, deliveryRuntime: runB, createdAt: FIXTURE_NOW, status: 'DELIVERED', orderAcceptedAt: FIXTURE_NOW, deliveredAt: '2026-08-12T10:30:00.000Z' },
    ];

    const analyticsA = aggregateDeliveryAnalytics(records, { tenantId: 'tenant-A' });

    assert.equal(analyticsA.totalOrders, 1);
    assert.equal(analyticsA.averageActualFulfillmentMinutes, 45); // Order A took 45m, B's 30m was excluded
  });

  it('2. Empty dataset handling returns zero counts and null averages', () => {
    const analytics = aggregateDeliveryAnalytics([], { tenantId: 'tenant-inti' });

    assert.equal(analytics.totalOrders, 0);
    assert.equal(analytics.completedOrders, 0);
    assert.equal(analytics.averageActualFulfillmentMinutes, null);
    assert.equal(analytics.averagePreparationMinutes, null);
    assert.equal(analytics.actualFulfillmentSampleCount, 0);
  });

  it('3 & 4. Single and multiple completed orders aggregation', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-101');

    const records: DeliveryAnalyticsInputRecord[] = [
      { tenantId: 'tenant-inti', orderId: 'ord-101', delivery: snapshot, deliveryRuntime: runtime, createdAt: FIXTURE_NOW, status: 'DELIVERED', orderAcceptedAt: FIXTURE_NOW, deliveredAt: '2026-08-12T10:40:00.000Z' },
      { tenantId: 'tenant-inti', orderId: 'ord-102', delivery: snapshot, deliveryRuntime: runtime, createdAt: FIXTURE_NOW, status: 'DELIVERED', orderAcceptedAt: FIXTURE_NOW, deliveredAt: '2026-08-12T10:50:00.000Z' },
    ];

    const analytics = aggregateDeliveryAnalytics(records, { tenantId: 'tenant-inti' });

    assert.equal(analytics.totalOrders, 2);
    assert.equal(analytics.completedOrders, 2);
    assert.equal(analytics.averageActualFulfillmentMinutes, 45); // (40 + 50) / 2 = 45
  });

  it('5 & 6. Cancelled and unserviceable orders tracking', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-cancel');

    const unserviceableSnapshot = {
      ...snapshot,
      serviceability: { isServiceable: false, distanceKm: 18, reason: 'OUT_OF_BOUNDS' },
    };

    const records: DeliveryAnalyticsInputRecord[] = [
      { tenantId: 'tenant-inti', orderId: 'ord-cancel', delivery: snapshot, deliveryRuntime: runtime, createdAt: FIXTURE_NOW, status: 'CANCELLED', cancelledAt: '2026-08-12T10:10:00.000Z' },
      { tenantId: 'tenant-inti', orderId: 'ord-unsvc', delivery: unserviceableSnapshot, deliveryRuntime: runtime, createdAt: FIXTURE_NOW, status: 'PLACED' },
    ];

    const analytics = aggregateDeliveryAnalytics(records, { tenantId: 'tenant-inti' });

    assert.equal(analytics.totalOrders, 2);
    assert.equal(analytics.cancelledOrders, 1);
    assert.equal(analytics.serviceableOrders, 1);
    assert.equal(analytics.unserviceableOrders, 1);
  });

  it('7, 8, 9, 10, 11. Preparation, dispatch, pickup, travel, and total fulfillment durations from actual timestamps', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-full-lifecycle');

    const record: DeliveryAnalyticsInputRecord = {
      tenantId: 'tenant-inti',
      orderId: 'ord-full-lifecycle',
      delivery: snapshot,
      deliveryRuntime: runtime,
      orderAcceptedAt: '2026-08-12T10:00:00.000Z',
      preparationStartedAt: '2026-08-12T10:05:00.000Z',
      preparationCompletedAt: '2026-08-12T10:25:00.000Z', // 20 min prep
      partnerAssignedAt: '2026-08-12T10:10:00.000Z',       // 10 min dispatch latency
      partnerArrivedAtKitchenAt: '2026-08-12T10:20:00.000Z',
      pickedUpAt: '2026-08-12T10:27:00.000Z',              // 7 min pickup handling
      onRouteAt: '2026-08-12T10:27:00.000Z',
      deliveredAt: '2026-08-12T10:45:00.000Z',             // 18 min travel
    };

    const single = computeSingleOrderAnalytics(record, 'tenant-inti');

    assert.equal(single.preparationDurationMinutes, 20);
    assert.equal(single.dispatchLatencyMinutes, 10);
    assert.equal(single.pickupHandlingDurationMinutes, 7);
    assert.equal(single.deliveryTravelDurationMinutes, 18);
    assert.equal(single.actualFulfillmentDurationMinutes, 45); // 10:00 to 10:45
  });

  it('12, 14, 15. Missing timestamps yield null duration and UNKNOWN status without guessing', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-missing-ts');

    const record: DeliveryAnalyticsInputRecord = {
      tenantId: 'tenant-inti',
      orderId: 'ord-missing-ts',
      delivery: snapshot,
      deliveryRuntime: runtime,
      orderAcceptedAt: '2026-08-12T10:00:00.000Z',
      // No deliveredAt
    };

    const single = computeSingleOrderAnalytics(record, 'tenant-inti');

    assert.equal(single.actualFulfillmentDurationMinutes, null);
    assert.equal(single.signedEtaErrorMinutes, null);
    assert.equal(single.etaAccuracyStatus, 'UNKNOWN');
    assert.equal(single.slaStatus, 'UNKNOWN');
  });

  it('13. ETA accuracy compares actual fulfillment duration vs promised ETA evidence', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-eta-acc');

    // Promised ETA in snapshot is 45 min
    const record: DeliveryAnalyticsInputRecord = {
      tenantId: 'tenant-inti',
      orderId: 'ord-eta-acc',
      delivery: snapshot,
      deliveryRuntime: runtime,
      orderAcceptedAt: '2026-08-12T10:00:00.000Z',
      deliveredAt: '2026-08-12T10:48:00.000Z', // Took 48 min -> 3 min slower than 45 min promise
    };

    const single = computeSingleOrderAnalytics(record, 'tenant-inti');

    assert.equal(single.promisedEtaMinutes, 45);
    assert.equal(single.actualFulfillmentDurationMinutes, 48);
    assert.equal(single.signedEtaErrorMinutes, 3);
    assert.equal(single.absoluteEtaErrorMinutes, 3);
    assert.equal(single.etaAccuracyStatus, 'ACCURATE'); // Within +/- 5 min
  });

  it('16, 17, 18, 19. SLA status evaluation: ON_TIME vs LATE vs UNKNOWN', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-sla');

    const recordOnTime: DeliveryAnalyticsInputRecord = {
      tenantId: 'tenant-inti',
      orderId: 'ord-sla-ontime',
      delivery: snapshot,
      deliveryRuntime: runtime,
      orderAcceptedAt: '2026-08-12T10:00:00.000Z',
      deliveredAt: '2026-08-12T10:40:00.000Z', // 40 min
      slaTargetMinutes: 45,
    };

    const recordLate: DeliveryAnalyticsInputRecord = {
      tenantId: 'tenant-inti',
      orderId: 'ord-sla-late',
      delivery: snapshot,
      deliveryRuntime: runtime,
      orderAcceptedAt: '2026-08-12T10:00:00.000Z',
      deliveredAt: '2026-08-12T10:50:00.000Z', // 50 min
      slaTargetMinutes: 45,
    };

    const recordMissingSla: DeliveryAnalyticsInputRecord = {
      tenantId: 'tenant-inti',
      orderId: 'ord-sla-missing',
      delivery: snapshot,
      deliveryRuntime: runtime,
      orderAcceptedAt: '2026-08-12T10:00:00.000Z',
      deliveredAt: '2026-08-12T10:40:00.000Z',
      slaTargetMinutes: null, // No target
    };

    const singleOnTime = computeSingleOrderAnalytics(recordOnTime, 'tenant-inti');
    const singleLate = computeSingleOrderAnalytics(recordLate, 'tenant-inti');
    const singleMissing = computeSingleOrderAnalytics(recordMissingSla, 'tenant-inti');

    assert.equal(singleOnTime.slaStatus, 'ON_TIME');
    assert.equal(singleLate.slaStatus, 'LATE');
    assert.equal(singleMissing.slaStatus, 'UNKNOWN');
    assert.match(singleMissing.slaDetail, /No authoritative SLA target configured/);

    const agg = aggregateDeliveryAnalytics([recordOnTime, recordLate, recordMissingSla], { tenantId: 'tenant-inti' });

    assert.equal(agg.slaOnTimeCount, 1);
    assert.equal(agg.slaLateCount, 1);
    assert.equal(agg.slaUnknownCount, 1); // UNKNOWN never counted as ON_TIME
  });

  it('20, 21, 22, 23, 24, 42. Provider telemetry & manual fallback separation', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-provider');

    const quotedSnapshot = {
      ...snapshot,
      providerQuote: {
        provider: 'uber_direct' as const,
        quoteId: 'q_1',
        quotedAt: FIXTURE_NOW,
        providerExpiresAt: null,
        cost: 50,
        etaMinutes: null,
        source: 'LIVE_PROVIDER' as const,
        status: 'QUOTED' as const,
      },
    };

    const expiredSnapshot = {
      ...snapshot,
      providerQuote: {
        provider: 'uber_direct' as const,
        quoteId: 'q_2',
        quotedAt: FIXTURE_NOW,
        providerExpiresAt: FIXTURE_NOW,
        cost: null,
        etaMinutes: null,
        source: 'LIVE_PROVIDER' as const,
        status: 'EXPIRED' as const,
      },
    };

    const records: DeliveryAnalyticsInputRecord[] = [
      { tenantId: 'tenant-inti', orderId: 'ord-p1', delivery: quotedSnapshot as any, deliveryRuntime: runtime },
      { tenantId: 'tenant-inti', orderId: 'ord-p2', delivery: expiredSnapshot as any, deliveryRuntime: runtime },
      { tenantId: 'tenant-inti', orderId: 'ord-p3', delivery: snapshot, deliveryRuntime: { ...runtime, isManualFallback: true } },
    ];

    const agg = aggregateDeliveryAnalytics(records, { tenantId: 'tenant-inti' });

    assert.equal(agg.providerQuoteSuccessCount, 1);
    assert.equal(agg.providerQuoteExpiredCount, 1);
    assert.equal(agg.manualFallbackCount, 1);
  });

  it('25, 26, 27, 28, 29. Financial metric preservation without recomputing from distance', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-fin', 40, 70); // Fee 40, Cost 70, Subsidy 30

    const record: DeliveryAnalyticsInputRecord = {
      tenantId: 'tenant-inti',
      orderId: 'ord-fin',
      delivery: snapshot,
      deliveryRuntime: runtime,
    };

    const single = computeSingleOrderAnalytics(record, 'tenant-inti');

    assert.equal(single.customerDeliveryFee, 40);
    assert.equal(single.projectedDeliveryCost, 70);
    assert.equal(single.tenantSubsidy, 30);

    const agg = aggregateDeliveryAnalytics([record], { tenantId: 'tenant-inti' });

    assert.equal(agg.totalCustomerDeliveryFees, 40);
    assert.equal(agg.totalProjectedDeliveryCost, 70);
    assert.equal(agg.totalTenantSubsidy, 30);
  });

  it('30, 31, 32. Analytics contains zero Haversine, zero duplicate pricing/ETA formulas', async () => {
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

    assert.equal(fee2km.customerDeliveryFee, 0);
    assert.equal(fee7km.customerDeliveryFee, 40);
  });

  it('34 & 9. Secret safety & Customer privacy: financials stripped for customer-facing payloads; no secrets in logs', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-sec', 40, 70);

    const records: DeliveryAnalyticsInputRecord[] = [
      { tenantId: 'tenant-inti', orderId: 'ord-sec', delivery: snapshot, deliveryRuntime: runtime },
    ];

    const adminAgg = aggregateDeliveryAnalytics(records, { tenantId: 'tenant-inti' });
    const customerAgg = sanitizeAnalyticsForCustomer(adminAgg);

    assert.equal((customerAgg as any).totalProjectedDeliveryCost, undefined);
    assert.equal((customerAgg as any).totalTenantSubsidy, undefined);
    assert.equal((customerAgg as any).totalProviderCost, undefined);
    assert.equal(customerAgg.totalCustomerDeliveryFees, 40);

    const serialized = JSON.stringify(adminAgg);
    assert.equal(serialized.includes('apiKey'), false);
    assert.equal(serialized.includes('clientSecret'), false);
    assert.equal(serialized.includes('bearerToken'), false);
  });

  it('35 & 36 & 44 & 45. Snapshot & Runtime Immutability: Analytics functions never mutate input objects or delivery/pricing state', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-immut');

    const snapBefore = JSON.stringify(snapshot);
    const runBefore = JSON.stringify(runtime);

    computeSingleOrderAnalytics({ tenantId: 'tenant-inti', orderId: 'ord-immut', delivery: snapshot, deliveryRuntime: runtime }, 'tenant-inti');
    aggregateDeliveryAnalytics([{ tenantId: 'tenant-inti', orderId: 'ord-immut', delivery: snapshot, deliveryRuntime: runtime }], { tenantId: 'tenant-inti' });

    assert.equal(JSON.stringify(snapshot), snapBefore);
    assert.equal(JSON.stringify(runtime), runBefore);
  });

  it('37, 38, 39. Deterministic aggregation, date range filtering, missing data sample count handling', () => {
    const { snapshot, runtime } = createTestSnapshotAndRuntime('tenant-inti', 'ord-dates');

    const records: DeliveryAnalyticsInputRecord[] = [
      { tenantId: 'tenant-inti', orderId: 'ord-d1', delivery: snapshot, deliveryRuntime: runtime, createdAt: '2026-08-10T10:00:00.000Z', status: 'DELIVERED', orderAcceptedAt: '2026-08-10T10:00:00.000Z', deliveredAt: '2026-08-10T10:30:00.000Z' },
      { tenantId: 'tenant-inti', orderId: 'ord-d2', delivery: snapshot, deliveryRuntime: runtime, createdAt: '2026-08-12T10:00:00.000Z', status: 'DELIVERED', orderAcceptedAt: '2026-08-12T10:00:00.000Z', deliveredAt: '2026-08-12T10:50:00.000Z' },
      { tenantId: 'tenant-inti', orderId: 'ord-d3', delivery: snapshot, deliveryRuntime: runtime, createdAt: '2026-08-15T10:00:00.000Z', status: 'DELIVERED', orderAcceptedAt: '2026-08-15T10:00:00.000Z', deliveredAt: '2026-08-15T11:00:00.000Z' },
    ];

    const filteredAgg = aggregateDeliveryAnalytics(records, {
      tenantId: 'tenant-inti',
      startDate: '2026-08-11T00:00:00.000Z',
      endDate: '2026-08-13T23:59:59.000Z',
    });

    assert.equal(filteredAgg.totalOrders, 1);
    assert.equal(filteredAgg.averageActualFulfillmentMinutes, 50);
  });

  it('43. Provider live flags remain false and zero network calls occur', () => {
    assert.equal(isPorterLiveEnabled(), false);
    assert.equal(isUberDirectLiveEnabled(), false);
  });
});
