import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createPricingProjectionRollout,
  createPricingProjectionRolloutInfrastructure,
} from '../pricing/rollout/PricingProjectionRolloutFactory';
import {
  PRICING_PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS,
  type PricingProjectionRolloutFeatureFlagReader,
} from '../pricing/rollout/pricingRolloutFeatureFlags';
import type { PricingProjectionRolloutTelemetryEvent } from '../pricing/rollout/PricingProjectionRolloutTelemetry';
import type { RolloutHealthSnapshot } from '../../domain/pricing/rollout/RolloutHealth';
import { ROLLOUT_BLOCK_REASONS, ROLLOUT_ROLLBACK_REASONS } from '../../domain/pricing/rollout/RolloutMetadata';

const ROLLOUT_ON: PricingProjectionRolloutFeatureFlagReader = () => true;
const ROLLOUT_OFF: PricingProjectionRolloutFeatureFlagReader = () => false;

const healthyHealth = (): RolloutHealthSnapshot => ({
  projectionReady: true,
  parityPercent: 100,
  operationalHealth: 'GREEN',
  projectionRepositoryHealthy: true,
  fallbackRatePercent: 0,
  averageLatencyMs: 40,
  p95LatencyMs: 50,
  telemetryHealthScore: 100,
});

describe('Pricing projection rollout SDK (M8 PR-12)', () => {
  it('defaults FF_PRICING_PROJECTION_ROLLOUT_ENABLED to off', () => {
    assert.equal(
      PRICING_PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS.flags.FF_PRICING_PROJECTION_ROLLOUT_ENABLED,
      false
    );
  });

  it('createPricingProjectionRollout resolves factory infrastructure', () => {
    const rollout = createPricingProjectionRollout({
      initialHealth: healthyHealth(),
    });
    assert.ok(rollout.policy);
    assert.ok(rollout.metrics);
    assert.ok(rollout.evaluator);
    assert.equal(rollout.decision, rollout.evaluator);
  });

  it('routes legacy when rollout flag is off', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_OFF,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('price-list-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.route, 'legacy');
      assert.equal(result.value.reason, ROLLOUT_BLOCK_REASONS.FLAG_DISABLED);
    }
  });

  it('routes projection at stage 5 when healthy and flag on', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('price-list-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.route, 'projection');
      assert.equal(result.value.rollback, false);
    }
  });

  it('automatic rollback routes legacy when repository unhealthy', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: {
        ...healthyHealth(),
        projectionRepositoryHealthy: false,
      },
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('price-list-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.route, 'legacy');
      assert.equal(result.value.rollback, true);
    }
  });

  it('automatic rollback routes legacy when parity unhealthy', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: {
        ...healthyHealth(),
        parityPercent: 95,
      },
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('price-list-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.route, 'legacy');
      assert.equal(result.value.rollback, true);
      assert.equal(result.value.reason, ROLLOUT_ROLLBACK_REASONS.PARITY_BELOW_THRESHOLD);
    }
  });

  it('automatic rollback routes legacy when operational unhealthy', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: {
        ...healthyHealth(),
        operationalHealth: 'RED',
      },
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('price-list-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.route, 'legacy');
      assert.equal(result.value.rollback, true);
    }
  });

  it('blocks promotion without manual approval', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: false },
    });

    const result = await rollout.evaluator.evaluatePromotion();
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.allowed, false);
      assert.ok(result.value.blockers.includes(ROLLOUT_BLOCK_REASONS.MANUAL_APPROVAL_REQUIRED));
    }
  });

  it('promotes stage when all promotion gates pass', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: true },
    });

    const promoted = await rollout.evaluator.promote();
    assert.equal(promoted.ok, true);
    if (promoted.ok) {
      assert.equal(promoted.value.currentStage, 1);
    }
  });

  it('promote fails when promotion blocked', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_OFF,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: true },
    });

    const promoted = await rollout.evaluator.promote();
    assert.equal(promoted.ok, false);
  });

  it('records metrics on routing decisions', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    await rollout.evaluator.evaluateRouting('price-list-metrics');
    const snapshot = await rollout.metrics.getSnapshot();
    assert.equal(snapshot.ok, true);
    if (snapshot.ok) {
      assert.equal(snapshot.value.totalRequests, 1);
      assert.equal(snapshot.value.projectionRequests, 1);
      assert.equal(snapshot.value.legacyRequests, 0);
      assert.equal(snapshot.value.fallbackCount, 0);
      assert.equal(snapshot.value.p95LatencyMs, 50);
      assert.equal(snapshot.value.repositoryHealth, true);
      assert.equal(snapshot.value.parityPercent, 100);
    }
  });

  it('records promotion and rollback metrics', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: true },
    });

    await rollout.evaluator.promote();

    const unhealthyRollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: {
        ...healthyHealth(),
        projectionRepositoryHealthy: false,
      },
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });
    await unhealthyRollout.evaluator.evaluateRouting('price-list-rollback');

    const snapshot = await rollout.metrics.getSnapshot();
    assert.equal(snapshot.ok, true);
    if (snapshot.ok) {
      assert.equal(snapshot.value.promotionCount, 1);
    }

    const rollbackSnapshot = await unhealthyRollout.metrics.getSnapshot();
    assert.equal(rollbackSnapshot.ok, true);
    if (rollbackSnapshot.ok) {
      assert.equal(rollbackSnapshot.value.rollbackCount, 1);
    }
  });

  it('emits pricing rollout telemetry events', async () => {
    const events: PricingProjectionRolloutTelemetryEvent[] = [];
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: true },
      onTelemetry: (event) => events.push(event),
    });

    await rollout.evaluator.evaluateRouting('price-list-telemetry');
    await rollout.evaluator.promote();

    assert.ok(events.some((event) => event.type === 'pricing_projection_rollout_started'));
    assert.ok(events.some((event) => event.type === 'pricing_projection_rollout_completed'));
    assert.ok(events.some((event) => event.type === 'pricing_projection_rollout_promoted'));
    assert.ok(events.some((event) => event.type === 'pricing_projection_rollout_stage_changed'));
  });

  it('evaluateRollback returns legacy recommendation when unhealthy', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: {
        ...healthyHealth(),
        operationalHealth: 'RED',
      },
      initialConfiguration: { currentStage: 3, manualApprovalGranted: true },
    });

    const rollback = await rollout.evaluator.evaluateRollback();
    assert.equal(rollback.ok, true);
    if (rollback.ok) {
      assert.equal(rollback.value.required, true);
    }
  });

  it('routing is deterministic for stable bucket', async () => {
    const rollout = createPricingProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 3, manualApprovalGranted: true },
    });

    const first = await rollout.evaluator.evaluateRouting('stable-price-list-key');
    const second = await rollout.evaluator.evaluateRouting('stable-price-list-key');
    assert.equal(first.ok, true);
    assert.equal(second.ok, true);
    if (first.ok && second.ok) {
      assert.equal(first.value.route, second.value.route);
      assert.equal(first.value.bucket, second.value.bucket);
    }
  });
});
