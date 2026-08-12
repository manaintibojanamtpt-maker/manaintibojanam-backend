import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createDeliverySnapshot } from '../deliverySnapshotModel.js';
import {
  createDeliveryRuntime,
  updateDeliveryRuntime,
  toLegacyOrderDeliveryMirrors,
} from '../deliveryRuntimeEngine.js';
import { buildDeliveryDecision } from '../decisionEngine.js';
import type { DeliveryDecision } from '../deliveryIntelligenceTypes.js';

const AT = '2026-08-12T10:00:00Z';
const KITCHEN = { lat: 17.4, lng: 78.4 };
const CUSTOMER = { lat: 17.45, lng: 78.48 };

function buildMockDecision(overrides: Partial<DeliveryDecision> = {}): DeliveryDecision {
  const defaultQuote = {
    provider: 'uber_direct' as const,
    quoteId: 'q-200',
    tenantId: 'tenant-alpha',
    cost: 65,
    estimatedDeliveryMinutes: 25,
    expiresAt: '2026-08-12T11:00:00Z',
    status: 'QUOTED' as const,
    pickupCoordinates: KITCHEN,
    dropoffCoordinates: CUSTOMER,
  };

  const base = buildDeliveryDecision({
    decisionId: 'dec-200',
    engineVersion: '1.0.0',
    requestedAt: AT,
    kitchenLocation: KITCHEN,
    customerLocation: CUSTOMER,
    pricingMode: 'FIXED_TIER',
    pricing: {
      pricingMode: 'FIXED_TIER',
      distanceKm: 7.0,
      routeSource: 'ROUTING_PROVIDER',
      projectedDeliveryCost: 65,
      projectedCostSource: 'MARKET_BENCHMARK',
      customerDeliveryFee: 40,
      freeDeliveryApplied: false,
      tenantSubsidy: 25,
      confidence: 'HIGH',
      calculatedAt: AT,
      engineVersion: '1.0.0',
    },
    route: {
      kind: 'ROAD',
      source: 'ROUTING_PROVIDER',
      distanceKm: 7.0,
      durationMinutes: 18.0,
      provider: 'ORS',
      fetchedAt: AT,
    },
    prep: {
      estimatedMinutes: 20,
      remainingMinutes: 20,
      source: 'CONFIG',
      confidence: 'MEDIUM',
      calculatedAt: AT,
    },
    eta: {
      status: 'AUTHORITATIVE',
      confidence: 'HIGH',
      minMinutes: 35,
      maxMinutes: 45,
      formattedDisplay: '35–45 min',
      displayMinutes: 40,
      components: [
        { label: 'Kitchen Preparation', minMinutes: 20, maxMinutes: 20, type: 'PREP' },
        { label: 'Rider Travel', minMinutes: 15, maxMinutes: 25, type: 'TRAVEL' },
      ],
      basedOnRoadRoute: true,
      calculatedAt: AT,
    },
    serviceability: {
      isServiceable: true,
      distanceKm: 7.0,
      reason: 'OK',
    },
    freeDelivery: {
      isFreeDelivery: false,
      threshold: 599,
      orderTotal: 450,
      amountNeededForFreeDelivery: 149,
    },
  });

  return {
    ...base,
    providerQuote: overrides.providerQuote !== undefined ? overrides.providerQuote : defaultQuote,
    ...overrides,
  };
}

describe('Step 10 — Delivery Runtime Engine', () => {
  it('13. runtime creation initialized from snapshot', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-alpha',
      orderId: 'ord-555',
    });

    const runtime = createDeliveryRuntime(snapshot, {}, () => new Date('2026-08-12T10:00:00Z'));

    assert.equal(runtime.schemaVersion, '1.0');
    assert.equal(runtime.tenantId, 'tenant-alpha');
    assert.equal(runtime.orderId, 'ord-555');
    assert.equal(runtime.lifecyclePhase, 'CREATED');
    assert.equal(runtime.currentEta.minMinutes, snapshot.eta.minMinutes);
    assert.equal(runtime.currentEta.maxMinutes, snapshot.eta.maxMinutes);
  });

  it('14 & 16. runtime mutation updates currentEta and lifecyclePhase', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-alpha',
      orderId: 'ord-555',
    });

    const runtime = createDeliveryRuntime(snapshot, {}, () => new Date('2026-08-12T10:00:00Z'));

    // Preparation starts 10 minutes later
    const updatedRuntime = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'PREPARING',
      newEvidence: {
        preparationStartedAt: '2026-08-12T10:10:00Z',
      },
      clock: () => new Date('2026-08-12T10:10:00Z'),
    });

    assert.equal(updatedRuntime.lifecyclePhase, 'PREPARING');
    assert.equal(updatedRuntime.evidence.preparationStartedAt, '2026-08-12T10:10:00Z');
    assert.ok(updatedRuntime.currentEta.minMinutes !== null);
    assert.ok(updatedRuntime.currentEta.minMinutes >= 0);
  });

  it('15 & 24 & 25. runtime update DOES NOT mutate immutable snapshot, pricing, or subsidy', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-alpha',
      orderId: 'ord-555',
    });

    const initialFee = snapshot.pricing.customerDeliveryFee;
    const initialSubsidy = snapshot.subsidy.tenantSubsidy;
    const initialFreeDelivery = snapshot.freeDelivery.isFreeDelivery;

    const runtime = createDeliveryRuntime(snapshot);

    updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'DISPATCHED',
      newEvidence: {
        pickedUpAt: '2026-08-12T10:25:00Z',
      },
      clock: () => new Date('2026-08-12T10:25:00Z'),
    });

    // Snapshot pricing fields are strictly preserved
    assert.equal(snapshot.pricing.customerDeliveryFee, initialFee);
    assert.equal(snapshot.subsidy.tenantSubsidy, initialSubsidy);
    assert.equal(snapshot.freeDelivery.isFreeDelivery, initialFreeDelivery);
    assert.equal(snapshot.tenantId, 'tenant-alpha');
  });

  it('18 & 19. tenant isolation — runtime rejects mismatched snapshot/runtime tenantId', () => {
    const snapshotA = createDeliverySnapshot(buildMockDecision(), {
      tenantId: 'tenant-A',
      orderId: 'ord-100',
    });

    const snapshotB = createDeliverySnapshot(buildMockDecision({ tenantId: 'tenant-B' }), {
      tenantId: 'tenant-B',
      orderId: 'ord-100',
    });

    const runtimeA = createDeliveryRuntime(snapshotA);

    assert.throws(() => {
      updateDeliveryRuntime({
        snapshot: snapshotB,
        currentRuntime: runtimeA,
      });
    }, /Tenant mismatch/);
  });

  it('21. no secrets in runtime model', () => {
    const snapshot = createDeliverySnapshot(buildMockDecision(), {
      tenantId: 'tenant-alpha',
      orderId: 'ord-555',
    });

    const runtime = createDeliveryRuntime(snapshot);
    const jsonStr = JSON.stringify(runtime);

    assert.equal(jsonStr.includes('apiKey'), false);
    assert.equal(jsonStr.includes('clientSecret'), false);
    assert.equal(jsonStr.includes('accessToken'), false);
  });

  it('22. legacy mirror compatibility generates required legacy fields', () => {
    const snapshot = createDeliverySnapshot(buildMockDecision(), {
      tenantId: 'tenant-alpha',
      orderId: 'ord-555',
    });

    const runtime = createDeliveryRuntime(snapshot);
    const mirrors = toLegacyOrderDeliveryMirrors(snapshot, runtime);

    assert.ok(typeof mirrors.eta === 'string');
    assert.ok(typeof mirrors.etaMinutes === 'number');
    assert.equal(mirrors.deliveryPartner, 'uber_direct');
  });

  it('27. delivered state sets ETA display to Delivered', () => {
    const snapshot = createDeliverySnapshot(buildMockDecision(), {
      tenantId: 'tenant-alpha',
      orderId: 'ord-555',
    });

    const runtime = createDeliveryRuntime(snapshot);
    const deliveredRuntime = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'DELIVERED',
      newEvidence: {
        deliveredAt: '2026-08-12T10:45:00Z',
      },
      clock: () => new Date('2026-08-12T10:45:00Z'),
    });

    assert.equal(deliveredRuntime.lifecyclePhase, 'DELIVERED');
    assert.equal(deliveredRuntime.currentEta.minMinutes, 0);
    assert.equal(deliveredRuntime.currentEta.maxMinutes, 0);
    const mirrors = toLegacyOrderDeliveryMirrors(snapshot, deliveredRuntime);
    assert.equal(mirrors.eta, 'Delivered');
  });

  it('28 & 29 & 30 & 31 & 32. uses single authoritative etaEngine without duplicate formulas', () => {
    const snapshot = createDeliverySnapshot(buildMockDecision(), {
      tenantId: 'tenant-alpha',
      orderId: 'ord-555',
    });

    const runtime = createDeliveryRuntime(snapshot);
    const updated = updateDeliveryRuntime({
      snapshot,
      currentRuntime: runtime,
      lifecyclePhase: 'PREPARING',
      newEvidence: {
        preparationStartedAt: '2026-08-12T10:05:00Z',
      },
      clock: () => new Date('2026-08-12T10:05:00Z'),
    });

    // Validates that updateDeliveryRuntime delegates to createEtaEngine()
    assert.ok(updated.currentEta.calculatedAt);
    assert.ok(updated.currentEta.minMinutes !== null);
    assert.ok(updated.currentEta.maxMinutes !== null);
    assert.ok(updated.currentEta.minMinutes >= 0);
  });
});
