/**
 * Phase 5 — STEP 8: Kitchen Preparation Engine tests.
 *
 * Covers the canonical PrepEstimate contract and every Step-8 requirement:
 * canonical configuration, legacy compatibility, precedence, missing
 * configuration, deterministic fallback, source, confidence, calculatedAt,
 * invalid zero/negative values, fractional support, item preparation semantics,
 * multiple items, capacity metadata, acceptance mode, actual-lifecycle math,
 * scheduled orders, tenant isolation, and dependency boundaries.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { DEFAULT_PREP_TIME_MINUTES } from '../../marketplace/etaEstimate.js';
import { PREP_ENGINE_ID, createPrepEngine, toDeliveryPrep } from '../prepEngine.js';
import type { PrepEngineRequest, PrepEngineResult } from '../prepEngine.js';
import type { KitchenConfigShape, PrepEstimate } from '../deliveryIntelligenceTypes.js';

const AT = '2026-08-11T10:00:00.000Z';
const NOW = new Date(AT);

function kitchenConfig(overrides: Partial<KitchenConfigShape> = {}): KitchenConfigShape {
  return { ...overrides };
}

function estimate(overrides: Partial<PrepEngineRequest> = {}): PrepEngineResult {
  return createPrepEngine().estimate({ tenantId: 'tenant-a', now: NOW, ...overrides });
}

describe('Step 8 — Kitchen Preparation Engine', () => {
  describe('canonical configuration', () => {
    it('1. kitchenConfig.defaultPrepTimeMinutes drives the estimate', () => {
      const r = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }) });
      assert.equal(r.status, 'ESTIMATED');
      assert.equal(r.estimatedMinutes, 20);
      assert.equal(r.remainingMinutes, 20);
      assert.deepEqual(r.configReference, { tier: 'KITCHEN_CONFIG', tenantId: 'tenant-a' });
    });

    it('2. legacy tenantDeliveryConfig.prepTime remains a supported fallback', () => {
      const r = estimate({ tenantDeliveryConfig: { prepTime: 30 } });
      assert.equal(r.estimatedMinutes, 30);
      assert.equal(r.configReference?.tier, 'LEGACY_DELIVERY_CONFIG');
    });

    it('3. canonical kitchenConfig wins over legacy deliveryConfig.prepTime', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        tenantDeliveryConfig: { prepTime: 30 },
      });
      assert.equal(r.estimatedMinutes, 20);
      assert.equal(r.configReference?.tier, 'KITCHEN_CONFIG');
    });

    it('4. missing configuration falls back to the approved repository default', () => {
      const r = estimate({});
      assert.equal(r.estimatedMinutes, DEFAULT_PREP_TIME_MINUTES);
      assert.equal(r.configReference?.tier, 'APPROVED_DEFAULT');
      assert.equal(r.confidence, 'LOW');
    });

    it('5. fallback behavior is deterministic across calls and engine instances', () => {
      const a = estimate({});
      const b = estimate({});
      const c = createPrepEngine().estimate({ tenantId: 'tenant-a', now: NOW });
      assert.equal(a.estimatedMinutes, DEFAULT_PREP_TIME_MINUTES);
      assert.deepEqual(b, a);
      assert.equal(c.estimatedMinutes, DEFAULT_PREP_TIME_MINUTES);
    });
  });

  describe('estimate metadata', () => {
    it('6. source is CONFIG for configured estimates and ACTUAL once lifecycle evidence exists', () => {
      assert.equal(estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }) }).source, 'CONFIG');
      assert.equal(
        toDeliveryPrep(estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }) })).source,
        'CONFIG',
      );
      const started = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        preparationStartedAt: '2026-08-11T09:55:00.000Z',
      });
      assert.equal(started.source, 'ACTUAL');
      assert.equal(toDeliveryPrep(started).source, 'ACTUAL');
    });

    it('7. confidence is MEDIUM for tenant config, LOW for the default, HIGH for actual evidence', () => {
      assert.equal(estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }) }).confidence, 'MEDIUM');
      assert.equal(estimate({ tenantDeliveryConfig: { prepTime: 30 } }).confidence, 'MEDIUM');
      assert.equal(estimate({}).confidence, 'LOW');
      const started = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        preparationStartedAt: '2026-08-11T09:55:00.000Z',
      });
      assert.equal(started.confidence, 'HIGH');
    });

    it('8. calculatedAt follows the deterministic request clock', () => {
      assert.equal(estimate({ now: NOW }).calculatedAt, AT);
      const custom = new Date('2026-08-11T12:30:00.000Z');
      assert.equal(estimate({ now: custom }).calculatedAt, custom.toISOString());
      assert.equal(estimate({}).engineVersion, PREP_ENGINE_ID);
    });

    it('9. zero/negative/invalid configuration is never used and never yields 0 prep', () => {
      const zero = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 0 }) });
      assert.equal(zero.estimatedMinutes, DEFAULT_PREP_TIME_MINUTES);
      const negative = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: -5 }),
        tenantDeliveryConfig: { prepTime: 30 },
      });
      assert.equal(negative.estimatedMinutes, 30);
      assert.equal(negative.configReference?.tier, 'LEGACY_DELIVERY_CONFIG');
      const bothInvalid = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 0 }),
        tenantDeliveryConfig: { prepTime: 0 },
      });
      assert.equal(bothInvalid.estimatedMinutes, DEFAULT_PREP_TIME_MINUTES);
      const nan = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: Number.NaN }) });
      assert.equal(nan.estimatedMinutes, DEFAULT_PREP_TIME_MINUTES);
      assert.ok((zero.estimatedMinutes ?? 0) > 0);
    });

    it('10. fractional prep minutes are supported as-is', () => {
      const canonical = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 22.5 }) });
      assert.equal(canonical.estimatedMinutes, 22.5);
      assert.equal(canonical.remainingMinutes, 22.5);
      const legacy = estimate({ tenantDeliveryConfig: { prepTime: 17.25 } });
      assert.equal(legacy.estimatedMinutes, 17.25);
    });
  });

  describe('items, capacity, acceptance mode', () => {
    it('11. itemPrepTimeMinutes is reused for per-item metadata; aggregation stays deferred', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({
          defaultPrepTimeMinutes: 20,
          itemPrepTimeMinutes: { biryani: 12, curry: 8 },
        }),
        items: [{ itemId: 'biryani', quantity: 2 }],
      });
      assert.deepEqual(r.itemEstimates, [{ itemId: 'biryani', estimatedMinutes: 12, source: 'ITEM_MAP' }]);
      // Order-level estimate stays the resolved default — never the sum of items.
      assert.equal(r.estimatedMinutes, 20);
    });

    it('12. multiple items are each reported; unknown items are omitted; no sum is computed', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20, itemPrepTimeMinutes: { a: 5, b: 7 } }),
        items: [{ itemId: 'a' }, { itemId: 'b' }, { itemId: 'unknown' }],
      });
      assert.equal(r.itemEstimates.length, 2);
      assert.deepEqual(
        r.itemEstimates.map((e) => e.itemId).sort(),
        ['a', 'b'],
      );
      assert.ok(r.itemEstimates.every((e) => e.source === 'ITEM_MAP'));
      assert.equal(r.estimatedMinutes, 20); // 5 + 7 = 12 is NOT used
      const dup = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20, itemPrepTimeMinutes: { a: 5 } }),
        items: [{ itemId: 'a' }, { itemId: 'a' }],
      });
      assert.equal(dup.itemEstimates.length, 1);
    });

    it('13. capacity is configuration metadata and authoritative workload passes through unaltered', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20, capacity: 10 }),
        workloadEvidence: {
          activeOrders: 3,
          maxConcurrentOrders: 12,
          prepQueueMins: 15,
          congestionLevel: 'medium',
          acceptingOrders: true,
          capturedAt: 1700000000300,
        },
      });
      assert.equal(r.capacity.configuredCapacity, 10);
      assert.deepEqual(r.capacity.workloadEvidence, {
        activeOrders: 3,
        maxConcurrentOrders: 12,
        prepQueueMins: 15,
        congestionLevel: 'medium',
        acceptingOrders: true,
        capturedAt: 1700000000300,
      });
      // Workload never folds into the Step-8 estimate — that is a later step.
      assert.equal(r.estimatedMinutes, 20);
      const plain = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }) });
      assert.equal(plain.capacity.configuredCapacity, null);
      assert.equal(plain.capacity.workloadEvidence, undefined);
    });

    it('14. orderAcceptanceMode is metadata only and never changes preparation duration', () => {
      const auto = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20, orderAcceptanceMode: 'AUTO' }) });
      const manual = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20, orderAcceptanceMode: 'MANUAL' }) });
      const none = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }) });
      assert.equal(auto.acceptanceMode, 'AUTO');
      assert.equal(manual.acceptanceMode, 'MANUAL');
      assert.equal(none.acceptanceMode, null);
      assert.equal(auto.estimatedMinutes, manual.estimatedMinutes);
      assert.equal(auto.estimatedMinutes, none.estimatedMinutes);
    });
  });

  describe('actual preparation lifecycle', () => {
    it('15. preparationStartedAt elapses remaining minutes from the estimate', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        preparationStartedAt: '2026-08-11T09:55:00.000Z', // 5 minutes before NOW
      });
      assert.equal(r.status, 'ACTUAL');
      assert.equal(r.estimatedMinutes, 20); // total estimate unchanged
      assert.equal(r.remainingMinutes, 15);
      assert.equal(r.preparationLifecycle?.status, 'IN_PROGRESS');
      assert.equal(r.preparationLifecycle?.elapsedMinutes, 5);
      // Fractional elapsed is preserved by the same formula.
      const fractional = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        preparationStartedAt: '2026-08-11T09:57:30.000Z', // 2.5 minutes before NOW
      });
      assert.equal(fractional.remainingMinutes, 17.5);
    });

    it('16. remaining never drops below zero even after the estimate elapses', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        preparationStartedAt: '2026-08-11T09:00:00.000Z', // 60 minutes before NOW
      });
      assert.equal(r.remainingMinutes, 0);
      assert.ok(r.remainingMinutes >= 0);
    });

    it('17. completed preparation yields zero remaining regardless of elapsed', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        preparationStartedAt: '2026-08-11T09:50:00.000Z',
        preparationCompletedAt: '2026-08-11T09:58:00.000Z',
      });
      assert.equal(r.remainingMinutes, 0);
      assert.equal(r.preparationLifecycle?.status, 'COMPLETED');
      assert.equal(r.status, 'ACTUAL');
      assert.equal(r.source, 'ACTUAL');
      assert.equal(r.confidence, 'HIGH');
      // Completion without a start timestamp is also authoritative.
      const completedOnly = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        preparationCompletedAt: '2026-08-11T09:58:00.000Z',
      });
      assert.equal(completedOnly.remainingMinutes, 0);
      assert.equal(completedOnly.preparationLifecycle?.status, 'COMPLETED');
    });

    it('18. preparation not started keeps remaining equal to the estimate', () => {
      const r = estimate({ kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }) });
      assert.equal(r.remainingMinutes, 20);
      assert.equal(r.preparationLifecycle?.status, 'NOT_STARTED');
      assert.equal(r.status, 'ESTIMATED');
    });

    it('19. scheduled orders are never assumed started without evidence', () => {
      const r = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        fulfillmentType: 'scheduled',
        scheduledFor: '2026-08-11T14:00:00.000Z',
      });
      assert.equal(r.remainingMinutes, 20);
      assert.equal(r.preparationLifecycle?.status, 'NOT_STARTED');
      assert.deepEqual(r.scheduled, { fulfillmentType: 'scheduled', scheduledFor: '2026-08-11T14:00:00.000Z' });
      // Authoritative lifecycle evidence still wins when present.
      const withEvidence = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        fulfillmentType: 'scheduled',
        preparationStartedAt: '2026-08-11T09:55:00.000Z',
      });
      assert.equal(withEvidence.preparationLifecycle?.status, 'IN_PROGRESS');
      assert.equal(withEvidence.remainingMinutes, 15);
    });
  });

  describe('tenant isolation', () => {
    it('20. tenant configuration is strictly isolated with no shared mutable state', () => {
      const shared = createPrepEngine();
      const a = shared.estimate({ tenantId: 'tenant-a', kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }), now: NOW });
      const b = shared.estimate({ tenantId: 'tenant-b', kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 40 }), now: NOW });
      const a2 = shared.estimate({ tenantId: 'tenant-a', kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }), now: NOW });
      assert.equal(a.estimatedMinutes, 20);
      assert.equal(b.estimatedMinutes, 40);
      assert.equal(a.configReference?.tenantId, 'tenant-a');
      assert.equal(b.configReference?.tenantId, 'tenant-b');
      // Repeating A after B still returns A's value — no bleed across requests.
      assert.equal(a2.estimatedMinutes, 20);
    });
  });

  describe('dependency boundaries', () => {
    const source = fs.readFileSync(path.join(process.cwd(), 'backend-lib/delivery/prepEngine.ts'), 'utf8');
    const imports = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

    it('21. no routing dependency — no travel module is imported and no distance math exists', () => {
      assert.ok(!imports.some((imp) => imp.includes('routeEngine')), `unexpected import: ${imports.join(', ')}`);
      assert.ok(!source.includes('haversineKm'));
      assert.ok(!source.includes('distanceKm'));
      assert.ok(!source.includes('routeEngine'));
    });

    it('22. no provider dependency — no Rapido/Porter/Uber or adapter integration', () => {
      assert.ok(!imports.some((imp) => imp.includes('adapters')));
      const lower = source.toLowerCase();
      assert.ok(!lower.includes('rapido'));
      assert.ok(!lower.includes('porter'));
      assert.ok(!lower.includes('uber'));
    });

    it('23. no checkout activation — the engine stays an internal capability', () => {
      assert.ok(!imports.some((imp) => imp.includes('checkout')));
      assert.ok(!source.includes('projectCheckout'));
      assert.ok(!source.includes('placeMarketplaceOrder'));
    });
  });

  describe('canonical PrepEstimate mapping', () => {
    it('maps the engine result onto the Step-2 PrepEstimate contract for later steps', () => {
      const result = estimate({
        kitchenConfig: kitchenConfig({ defaultPrepTimeMinutes: 20 }),
        preparationStartedAt: '2026-08-11T09:55:00.000Z',
      });
      const prep: PrepEstimate = toDeliveryPrep(result);
      assert.equal(prep.estimatedMinutes, 20);
      assert.equal(prep.remainingMinutes, 15);
      assert.equal(prep.source, 'ACTUAL');
      assert.equal(prep.confidence, 'HIGH');
      assert.equal(prep.calculatedAt, AT);
      assert.deepEqual(
        Object.keys(prep).sort(),
        ['calculatedAt', 'confidence', 'estimatedMinutes', 'remainingMinutes', 'source'],
      );
    });
  });
});
