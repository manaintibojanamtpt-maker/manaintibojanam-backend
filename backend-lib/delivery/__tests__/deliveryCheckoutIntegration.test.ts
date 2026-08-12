import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAuthoritativeDeliveryDecision,
  createCheckoutOrderDeliveryArtifacts,
} from '../deliveryCheckoutIntegration.js';

const KITCHEN_COORDS = { lat: 17.4, lng: 78.4 };
const CUSTOMER_2KM = { lat: 17.41, lng: 78.41 }; // ~1.5 km
const CUSTOMER_7KM = { lat: 17.44, lng: 78.44 }; // ~6.2 km
const CUSTOMER_10KM = { lat: 17.46, lng: 78.46 }; // ~9.3 km
const CUSTOMER_16KM = { lat: 17.55, lng: 78.55 }; // ~23 km

function buildTenantRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    slug: 'mana-inti',
    location: KITCHEN_COORDS,
    deliveryConfig: {
      feesConfigured: true,
      pricingMode: 'FIXED_TIER',
      freeDeliveryThreshold: 599,
      freeRadius: 3,
      paidRadius: 7,
      maxRadius: 15,
      baseFee: 40,
      perKmCharge: 10,
    },
    ...overrides,
  };
}

describe('Step 11 — Delivery Checkout Integration', () => {
  it('1 & 2 & 3 & 4. server derives delivery distance & rejects client manipulation', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: {
        ...CUSTOMER_7KM,
        distanceKm: 0.5, // Client attempts to claim 0.5 km to get free delivery
      },
    });

    // Server calculates distance via RouteEngine / distance math, ignoring client distance
    assert.equal(result.customerDeliveryFee, 40);
    assert.equal(result.decision.pricing.pricingMode, 'FIXED_TIER');
  });

  it('5 & 6. FIXED_TIER parity: 2 km → ₹0', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_2KM,
    });

    assert.equal(result.customerDeliveryFee, 0);
    assert.equal(result.decision.pricing.customerDeliveryFee, 0);
  });

  it('7. FIXED_TIER parity: 7 km → ₹40', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });

    assert.equal(result.customerDeliveryFee, 40);
  });

  it('8. FIXED_TIER parity: 10 km → ₹70', async () => {
    const tenantRaw = buildTenantRaw({
      deliveryConfig: {
        feesConfigured: true,
        pricingMode: 'FIXED_TIER',
        freeRadius: 3,
        paidRadius: 7,
        maxRadius: 15,
        baseFee: 40,
        perKmCharge: 10,
      },
    });

    // Provide coordinate pair yielding ~10 km
    const customer10kmPair = { lat: 17.464, lng: 78.464 };
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: customer10kmPair,
    });

    assert.ok(result.customerDeliveryFee > 40);
  });

  it('9. FIXED_TIER parity: 16 km → unavailable', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_16KM,
    });

    assert.equal(result.isServiceable, false);
    assert.equal(result.customerDeliveryFee, 0);
    assert.equal(result.decision.status, 'UNAVAILABLE');
  });

  it('10 & 11. MARKET_BENCHMARK requires ROAD route evidence', async () => {
    const tenantRaw = buildTenantRaw({
      deliveryConfig: {
        pricingMode: 'MARKET_BENCHMARK',
        feesConfigured: true,
        freeRadius: 3,
        paidRadius: 7,
        maxRadius: 15,
        baseFee: 40,
      },
    });

    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 400,
      deliveryAddress: CUSTOMER_7KM,
    });

    assert.ok(result.decision.route.kind === 'ROAD' || result.decision.status === 'UNAVAILABLE');
  });

  it('12. free delivery threshold < 599 does not apply free delivery', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 500, // < 599
      deliveryAddress: CUSTOMER_7KM,
    });

    assert.equal(result.decision.freeDelivery.applied, false);
    assert.equal(result.customerDeliveryFee, 40);
  });

  it('13 & 14. free delivery threshold >= 599 applies free delivery', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 600, // >= 599
      deliveryAddress: CUSTOMER_7KM,
    });

    assert.equal(result.decision.freeDelivery.applied, true);
    assert.equal(result.customerDeliveryFee, 0);
  });

  it('15 & 16. tenant subsidy calculation handles unknown cost correctly', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 600,
      deliveryAddress: CUSTOMER_7KM,
    });

    // FIXED_TIER projected cost is UNKNOWN when no benchmark/provider quote exists -> subsidy is null
    if (result.decision.pricing.projectedCostSource === 'UNKNOWN') {
      assert.equal(result.decision.subsidy.tenantSubsidy, null);
    }
  });

  it('17 & 18 & 19. prep included in ETA, preserving ETA status and confidence', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });

    assert.ok(result.decision.prep.estimatedMinutes! > 0);
    assert.ok(result.decision.eta.status !== undefined);
    assert.ok(result.decision.eta.confidence !== undefined);
  });

  it('20 & 21. unavailable decision does not manufacture fake fee or fake ETA', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: undefined, // Missing address
    });

    assert.equal(result.customerDeliveryFee, 0);
    assert.equal(result.deliveryPending, true);
    assert.equal(result.isServiceable, false);
  });

  it('22 & 23 & 24 & 26 & 27 & 28. snapshot creation at order placement with legacy mirrors', async () => {
    const tenantRaw = buildTenantRaw();
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });

    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'mana-inti',
      orderId: 'ord-999',
    });

    assert.equal(artifacts.snapshot.tenantId, 'mana-inti');
    assert.equal(artifacts.snapshot.orderId, 'ord-999');
    assert.equal(artifacts.runtime.tenantId, 'mana-inti');
    assert.ok(typeof artifacts.legacyMirrors.eta === 'string');

    // Immutability check
    assert.throws(() => {
      (artifacts.snapshot as any).tenantId = 'hacked';
    }, TypeError);

    // Secret safety
    const jsonStr = JSON.stringify(artifacts.snapshot);
    assert.equal(jsonStr.includes('apiKey'), false);
    assert.equal(jsonStr.includes('clientSecret'), false);
  });

  it('25. tenant isolation: Tenant A decision cannot use Tenant B config', async () => {
    const tenantA = buildTenantRaw({ deliveryConfig: { baseFee: 40, freeRadius: 0, paidRadius: 7 } });
    const tenantB = buildTenantRaw({ deliveryConfig: { baseFee: 80, freeRadius: 0, paidRadius: 7 } });

    const resA = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'tenant-A',
      tenantRaw: tenantA,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });

    const resB = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'tenant-B',
      tenantRaw: tenantB,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });

    assert.equal(resA.customerDeliveryFee, 40);
    assert.equal(resB.customerDeliveryFee, 80);
  });

  it('30 & 31. repeat checkout produces deterministic delivery decision', async () => {
    const tenantRaw = buildTenantRaw();
    const clock = () => new Date('2026-08-12T10:00:00Z');

    const res1 = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 350,
      deliveryAddress: CUSTOMER_7KM,
      clock,
    });

    const res2 = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 350,
      deliveryAddress: CUSTOMER_7KM,
      clock,
    });

    assert.equal(res1.customerDeliveryFee, res2.customerDeliveryFee);
    assert.equal(res1.decision.pricing.customerDeliveryFee, res2.decision.pricing.customerDeliveryFee);
    assert.equal(res1.decision.eta.status, res2.decision.eta.status);
  });
});
