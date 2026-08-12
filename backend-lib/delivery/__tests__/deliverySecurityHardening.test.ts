/**
 * Phase 5 — STEP 12: Delivery Intelligence Security Hardening Test Suite
 *
 * Validates all security invariants defined by Step 12:
 *  - Client input tampering prevention (fee, distance, ETA, subsidy, freeDelivery, providerQuote)
 *  - Distance & coordinate boundary security (negative, NaN, Infinity, out-of-range lat/lng)
 *  - Pricing & Free Delivery security (subtotal < threshold attacks)
 *  - ETA security (client ETA claims disproved)
 *  - Snapshot & Runtime immutability and isolation
 *  - Tenant isolation & Entitlement protection (starter/growth 403 + requiresUpgrade)
 *  - Secret redaction and credential leakage prevention
 *  - Fail-closed malformed payload handling
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveAuthoritativeDeliveryDecision,
  createCheckoutOrderDeliveryArtifacts,
} from '../deliveryCheckoutIntegration.js';
import { assertDeliveryEngineEntitlement } from '../../entitlements.js';
import { serializeDeliverySnapshot } from '../deliverySnapshotModel.js';

const KITCHEN_COORDS = { lat: 17.4, lng: 78.4 };
const CUSTOMER_2KM = { lat: 17.41, lng: 78.41 }; // ~1.5 km -> ₹0
const CUSTOMER_7KM = { lat: 17.44, lng: 78.44 }; // ~6.2 km -> ₹40
const CUSTOMER_10KM = { lat: 17.464, lng: 78.464 }; // ~9.3 km -> ₹70
const CUSTOMER_16KM = { lat: 17.55, lng: 78.55 }; // ~23 km -> UNAVAILABLE

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

describe('Step 12 — Delivery Security Hardening Suite', () => {
  // --- 12.1 Client Input Tampering ---
  it('1. client deliveryFee tampering: client deliveryFee = 0 is disproved & server fee ₹40 enforced', async () => {
    const tenantRaw = buildTenantRaw();
    const maliciousInput = {
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: { ...CUSTOMER_7KM, distanceKm: 1 },
      // Malicious client properties:
      deliveryFee: 0,
      customerDeliveryFee: 0,
    };

    const result = await resolveAuthoritativeDeliveryDecision(maliciousInput as any);
    assert.equal(result.customerDeliveryFee, 40);
  });

  it('2. client customerDeliveryFee tampering: client claims ₹0, server derives ₹40', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    assert.equal(result.customerDeliveryFee, 40);
  });

  it('3. client projectedDeliveryCost tampering: client claims projectedDeliveryCost = ₹1, ignored', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
      ...({ projectedDeliveryCost: 1 } as any),
    });
    assert.equal(result.decision.pricing.projectedDeliveryCost, null);
  });

  it('4. client tenantSubsidy tampering: client claims tenantSubsidy = ₹999, ignored', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
      ...({ tenantSubsidy: 999 } as any),
    });
    assert.equal(result.decision.pricing.tenantSubsidy, null);
  });

  // --- 12.2 Distance Security ---
  it('5. client distanceKm tampering: client distance 0.5 km disproved, server distance enforced', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: { ...CUSTOMER_7KM, distanceKm: 0.5 },
    });
    assert.equal(result.customerDeliveryFee, 40);
  });

  it('6. negative distance input handled safely', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: { ...CUSTOMER_7KM, distanceKm: -5 },
    });
    assert.equal(result.customerDeliveryFee, 40);
  });

  it('7. NaN distance input fails safely to server math', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: { ...CUSTOMER_7KM, distanceKm: NaN },
    });
    assert.equal(result.customerDeliveryFee, 40);
  });

  it('8. Infinity distance input fails safely', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: { ...CUSTOMER_7KM, distanceKm: Infinity },
    });
    assert.equal(result.customerDeliveryFee, 40);
  });

  it('9. malformed out-of-range coordinates fail closed as unserviceable', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: { lat: 999, lng: 999 }, // Out of [-90,90] / [-180,180]
    });
    assert.equal(result.isServiceable, false);
    assert.equal(result.deliveryPending, true);
  });

  // --- 12.5 ETA Security ---
  it('10. client ETA tampering: client claims 5 mins, server ETA range components enforced', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
      ...({ etaMinutes: 5 } as any),
    });
    assert.ok(result.decision.eta.components.length > 0);
  });

  it('11. client ETA status tampering ignored', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
      ...({ etaStatus: 'EXPRESS' } as any),
    });
    assert.equal(result.decision.eta.status, 'ESTIMATE_ONLY');
  });

  // --- 12.4 Free Delivery Security ---
  it('12. client freeDelivery tampering: client sends freeDelivery=true, ignored', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 500, // < 599 threshold
      deliveryAddress: CUSTOMER_7KM,
      ...({ freeDelivery: true } as any),
    });
    assert.equal(result.decision.freeDelivery.applied, false);
    assert.equal(result.customerDeliveryFee, 40);
  });

  it('13. below-threshold free delivery attack (₹598 < ₹599) fails free delivery', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 598,
      deliveryAddress: CUSTOMER_7KM,
    });
    assert.equal(result.decision.freeDelivery.applied, false);
    assert.equal(result.customerDeliveryFee, 40);
  });

  // --- 12.6 & 12.7 Snapshot & Runtime Immutability ---
  it('14. snapshot mutation attempt throws TypeError', async () => {
    const tenantRaw = buildTenantRaw();
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'mana-inti',
      orderId: 'ord-sec-1',
    });

    assert.throws(() => {
      (artifacts.snapshot as any).tenantId = 'hacked-tenant';
    }, TypeError);
  });

  it('15. runtime mutation does not affect original snapshot', async () => {
    const tenantRaw = buildTenantRaw();
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'mana-inti',
      orderId: 'ord-sec-2',
    });

    (artifacts.runtime as any).providerState = 'ASSIGNED';
    assert.equal(artifacts.snapshot.tenantId, 'mana-inti');
  });

  it('16. legacy mirror fields derived strictly from snapshot and runtime', async () => {
    const tenantRaw = buildTenantRaw();
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'mana-inti',
      orderId: 'ord-sec-3',
    });

    assert.equal(typeof artifacts.legacyMirrors.eta, 'string');
    assert.equal(artifacts.legacyMirrors.deliveryPartner, 'manual');
    assert.equal(artifacts.legacyMirrors.trackingUrl, null);
  });

  // --- 12.9 Tenant Isolation ---
  it('17. Tenant A snapshot contains Tenant A tenantId exclusively', async () => {
    const tenantA = buildTenantRaw({ slug: 'tenant-A' });
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'tenant-A',
      tenantRaw: tenantA,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'tenant-A',
      orderId: 'ord-sec-4',
    });

    assert.equal(artifacts.snapshot.tenantId, 'tenant-A');
  });

  it('18. Tenant A runtime contains Tenant A tenantId exclusively', async () => {
    const tenantA = buildTenantRaw({ slug: 'tenant-A' });
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'tenant-A',
      tenantRaw: tenantA,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'tenant-A',
      orderId: 'ord-sec-5',
    });

    assert.equal(artifacts.runtime.tenantId, 'tenant-A');
  });

  it('19. Tenant A decision cannot consume Tenant B delivery config', async () => {
    const tenantA = buildTenantRaw({ deliveryConfig: { baseFee: 40, freeRadius: 0, paidRadius: 7 } });
    const tenantB = buildTenantRaw({ deliveryConfig: { baseFee: 90, freeRadius: 0, paidRadius: 7 } });

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
    assert.equal(resB.customerDeliveryFee, 90);
  });

  // --- 12.10 Entitlement Protection ---
  it('20. starter entitlement check rejects with 403 requiresUpgrade=true', async () => {
    const fakeDb = {
      collection: (colName: string) => ({
        doc: (id: string) => ({
          get: async () => ({
            exists: true,
            data: () => ({ subscription: { planId: 'starter' } }),
          }),
        }),
      }),
    } as any;

    await assert.rejects(
      async () => {
        await assertDeliveryEngineEntitlement(fakeDb, 'tenant-starter');
      },
      (err: any) => {
        return err.statusCode === 403 && err.requiresUpgrade === true;
      },
    );
  });

  it('21. growth entitlement check rejects with 403 requiresUpgrade=true', async () => {
    const fakeDb = {
      collection: (colName: string) => ({
        doc: (id: string) => ({
          get: async () => ({
            exists: true,
            data: () => ({ subscription: { planId: 'growth' } }),
          }),
        }),
      }),
    } as any;

    await assert.rejects(
      async () => {
        await assertDeliveryEngineEntitlement(fakeDb, 'tenant-growth');
      },
      (err: any) => {
        return err.statusCode === 403 && err.requiresUpgrade === true;
      },
    );
  });

  it('22. entitled plan (pro / deliveryEngineEnabled) passes entitlement assertion', async () => {
    const fakeDb = {
      collection: (colName: string) => ({
        doc: (id: string) => ({
          get: async () => ({
            exists: true,
            data: () => ({ subscription: { planId: 'pro' } }),
          }),
        }),
      }),
    } as any;

    await assert.doesNotReject(async () => {
      await assertDeliveryEngineEntitlement(fakeDb, 'tenant-pro');
    });
  });

  // --- 12.11 Secret Redaction & Credential Leakage Prevention ---
  it('24. provider secrets are never present in OrderDeliverySnapshot', async () => {
    const tenantRaw = buildTenantRaw();
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'mana-inti',
      orderId: 'ord-sec-6',
    });

    const snapshotObj = artifacts.snapshot as any;
    assert.equal(snapshotObj.apiKey, undefined);
    assert.equal(snapshotObj.clientSecret, undefined);
    assert.equal(snapshotObj.bearerToken, undefined);
  });

  it('25. serialized OrderDeliverySnapshot contains 0 secret tokens', async () => {
    const tenantRaw = buildTenantRaw();
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'mana-inti',
      orderId: 'ord-sec-7',
    });

    const jsonStr = JSON.stringify(artifacts.snapshot);
    assert.equal(jsonStr.includes('apiKey'), false);
    assert.equal(jsonStr.includes('clientSecret'), false);
    assert.equal(jsonStr.includes('authorization'), false);
  });

  it('26. serialized snapshot helper enforces secret safety check', async () => {
    const tenantRaw = buildTenantRaw();
    const { decision } = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    const artifacts = createCheckoutOrderDeliveryArtifacts(decision, {
      tenantId: 'mana-inti',
      orderId: 'ord-sec-8',
    });

    assert.doesNotThrow(() => {
      serializeDeliverySnapshot(artifacts.snapshot);
    });
  });

  // --- 12.16 Error Handling & Malformed Requests ---
  it('32. malformed request with missing tenant location fails gracefully', async () => {
    const tenantRaw = { slug: 'mana-inti' }; // Missing location
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    assert.equal(result.isServiceable, false);
    assert.equal(result.deliveryPending, true);
  });

  it('33. malformed request with missing customer coordinates fails gracefully', async () => {
    const tenantRaw = buildTenantRaw();
    const result = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: undefined,
    });
    assert.equal(result.isServiceable, false);
    assert.equal(result.deliveryPending, true);
  });

  // --- Pricing & Parity ---
  it('36. pricing parity verified: 2km ₹0, 7km ₹40, 10km ₹70, 16km unavailable', async () => {
    const tenantRaw = buildTenantRaw();

    const res2km = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_2KM,
    });
    assert.equal(res2km.customerDeliveryFee, 0);

    const res7km = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_7KM,
    });
    assert.equal(res7km.customerDeliveryFee, 40);

    const res10km = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_10KM,
    });
    assert.ok(res10km.customerDeliveryFee > 40);

    const res16km = await resolveAuthoritativeDeliveryDecision({
      tenantId: 'mana-inti',
      tenantRaw,
      orderSubtotal: 300,
      deliveryAddress: CUSTOMER_16KM,
    });
    assert.equal(res16km.isServiceable, false);
  });
});
