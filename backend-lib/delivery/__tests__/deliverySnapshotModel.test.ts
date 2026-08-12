import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createDeliverySnapshot,
  serializeDeliverySnapshot,
  parseDeliverySnapshot,
} from '../deliverySnapshotModel.js';
import { buildDeliveryDecision } from '../decisionEngine.js';
import type { DeliveryDecision } from '../deliveryIntelligenceTypes.js';

const AT = '2026-08-12T10:00:00Z';
const KITCHEN = { lat: 17.4, lng: 78.4 };
const CUSTOMER = { lat: 17.45, lng: 78.48 };

function buildMockDecision(overrides: Partial<DeliveryDecision> = {}): DeliveryDecision {
  const defaultQuote = {
    provider: 'porter' as const,
    quoteId: 'q-100',
    tenantId: 'tenant-gold',
    cost: 55,
    estimatedDeliveryMinutes: 25,
    expiresAt: '2026-08-12T11:00:00Z',
    status: 'QUOTED' as const,
    pickupCoordinates: KITCHEN,
    dropoffCoordinates: CUSTOMER,
  };

  const base = buildDeliveryDecision({
    decisionId: 'dec-100',
    engineVersion: '1.0.0',
    requestedAt: AT,
    kitchenLocation: KITCHEN,
    customerLocation: CUSTOMER,
    pricingMode: 'FIXED_TIER',
    pricing: {
      pricingMode: 'FIXED_TIER',
      distanceKm: 7.0,
      routeSource: 'ROUTING_PROVIDER',
      projectedDeliveryCost: 55,
      projectedCostSource: 'MARKET_BENCHMARK',
      customerDeliveryFee: 40,
      freeDeliveryApplied: false,
      tenantSubsidy: 15,
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

describe('Step 10 — Delivery Snapshot Model', () => {
  it('1. snapshot creation succeeds from a canonical DeliveryDecision', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    assert.equal(snapshot.schemaVersion, '1.0');
    assert.equal(snapshot.tenantId, 'tenant-gold');
    assert.equal(snapshot.orderId, 'ord-101');
    assert.ok(snapshot.snapshotId.startsWith('snap_tenant-gold_ord-101_'));
  });

  it('2. snapshot contains canonical pricing', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    assert.equal(snapshot.pricing.customerDeliveryFee, 40);
    assert.equal(snapshot.pricing.pricingMode, 'FIXED_TIER');
  });

  it('3. snapshot contains free-delivery decision', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    assert.equal(snapshot.freeDelivery.isFreeDelivery, false);
    assert.equal(snapshot.freeDelivery.threshold, 599);
  });

  it('4. snapshot contains tenant subsidy', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    assert.equal(snapshot.subsidy.tenantSubsidy, 15);
  });

  it('5. snapshot contains route evidence', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    assert.equal(snapshot.route.kind, 'ROAD');
    if (snapshot.route.kind === 'ROAD') {
      assert.equal(snapshot.route.distanceKm, 7.0);
    }
  });

  it('6. snapshot contains ETA evidence', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    assert.ok(snapshot.eta.displayMinutes > 0);
    assert.equal(snapshot.eta.confidence, 'HIGH');
  });

  it('7. snapshot contains provider reference', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    assert.ok(snapshot.providerReference);
    assert.equal(snapshot.providerReference?.providerId, 'porter');
  });

  it('8. snapshot preserves engine versions', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
      engineVersion: '1.2.3',
    });

    assert.equal(snapshot.engineVersion, '1.2.3');
  });

  it('9 & 10. snapshot deterministic serialization and deserialization', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    const serialized = serializeDeliverySnapshot(snapshot);
    const parsed = parseDeliverySnapshot(serialized);

    assert.equal(parsed.tenantId, snapshot.tenantId);
    assert.equal(parsed.orderId, snapshot.orderId);
    assert.equal(parsed.pricing.customerDeliveryFee, snapshot.pricing.customerDeliveryFee);
  });

  it('11. malformed snapshot rejection', () => {
    assert.throws(() => parseDeliverySnapshot(null), /input is not an object/);
    assert.throws(() => parseDeliverySnapshot({ schemaVersion: '2.0' }), /Unsupported snapshot schema version/);
    assert.throws(() => parseDeliverySnapshot({ schemaVersion: '1.0', tenantId: '' }), /missing or invalid tenantId/);
  });

  it('12. snapshot immutability (frozen)', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    assert.throws(() => {
      (snapshot as any).tenantId = 'hacked-tenant';
    }, TypeError);

    assert.throws(() => {
      (snapshot.pricing as any).customerDeliveryFee = 0;
    }, TypeError);
  });

  it('20. no secrets in snapshot', () => {
    const decision = buildMockDecision();
    const snapshot = createDeliverySnapshot(decision, {
      tenantId: 'tenant-gold',
      orderId: 'ord-101',
    });

    const jsonStr = JSON.stringify(snapshot);
    assert.equal(jsonStr.includes('apiKey'), false);
    assert.equal(jsonStr.includes('clientSecret'), false);
    assert.equal(jsonStr.includes('accessToken'), false);
  });
});
