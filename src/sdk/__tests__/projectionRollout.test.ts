import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { createProjectionRolloutInfrastructure } from '../order/rollout/ProjectionRolloutFactory';
import {
  PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS,
  type ProjectionRolloutFeatureFlagReader,
} from '../order/rollout/rolloutFeatureFlags';
import type { ProjectionRolloutTelemetryEvent } from '../order/rollout/ProjectionRolloutTelemetry';
import type { RolloutHealthSnapshot } from '../../domain/order/rollout/RolloutHealth';
import { ROLLOUT_BLOCK_REASONS } from '../../domain/order/rollout/RolloutMetadata';

const ROLLOUT_ON: ProjectionRolloutFeatureFlagReader = () => true;
const ROLLOUT_OFF: ProjectionRolloutFeatureFlagReader = () => false;

const healthyHealth = (): RolloutHealthSnapshot => ({
  parityReady: true,
  parityPercent: 100,
  operationalHealth: 'GREEN',
  projectionRepositoryHealthy: true,
  fallbackRatePercent: 0,
  p95LatencyMs: 50,
  telemetryHealthScore: 100,
});

describe('Projection rollout SDK (M6 PR-12)', () => {
  it('defaults rollout flag to OFF', () => {
    assert.equal(PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS.flags.FF_ORDER_PROJECTION_ROLLOUT_ENABLED, false);
  });

  it('routes legacy when rollout flag is off', async () => {
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_OFF,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('order-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.route, 'legacy');
      assert.equal(result.value.reason, ROLLOUT_BLOCK_REASONS.FLAG_DISABLED);
    }
  });

  it('routes projection at stage 5 when healthy and flag on', async () => {
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('order-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.route, 'projection');
      assert.equal(result.value.rollback, false);
    }
  });

  it('automatic rollback routes legacy when repository unhealthy', async () => {
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: {
        ...healthyHealth(),
        projectionRepositoryHealthy: false,
      },
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('order-001');
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.value.route, 'legacy');
      assert.equal(result.value.rollback, true);
    }
  });

  it('blocks promotion without manual approval', async () => {
    const rollout = createProjectionRolloutInfrastructure({
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
    const rollout = createProjectionRolloutInfrastructure({
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
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_OFF,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: true },
    });

    const promoted = await rollout.evaluator.promote();
    assert.equal(promoted.ok, false);
  });

  it('records metrics on routing decisions', async () => {
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    await rollout.evaluator.evaluateRouting('order-metrics');
    const snapshot = await rollout.metrics.getSnapshot();
    assert.equal(snapshot.ok, true);
    if (snapshot.ok) {
      assert.equal(snapshot.value.totalRequests, 1);
      assert.equal(snapshot.value.projectionRequests, 1);
      assert.equal(snapshot.value.fallbackRequests, 0);
    }
  });

  it('emits rollout telemetry events', async () => {
    const events: ProjectionRolloutTelemetryEvent[] = [];
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: true },
      onTelemetry: (event) => events.push(event),
    });

    await rollout.evaluator.evaluateRouting('order-telemetry');
    await rollout.evaluator.promote();

    assert.ok(events.some((event) => event.type === 'projection_rollout_started'));
    assert.ok(events.some((event) => event.type === 'projection_rollout_completed'));
    assert.ok(events.some((event) => event.type === 'projection_rollout_promoted'));
    assert.ok(events.some((event) => event.type === 'projection_rollout_stage_changed'));
  });
});
