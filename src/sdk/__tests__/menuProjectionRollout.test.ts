import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  createMenuProjectionRollout,
  createProjectionRolloutInfrastructure,
} from '../menu/rollout/ProjectionRolloutFactory';
import {
  MENU_PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS,
  type MenuProjectionRolloutFeatureFlagReader,
} from '../menu/rollout/rolloutFeatureFlags';
import type { MenuProjectionRolloutTelemetryEvent } from '../menu/rollout/ProjectionRolloutTelemetry';
import type { RolloutHealthSnapshot } from '../../domain/menu/rollout/RolloutHealth';
import { ROLLOUT_BLOCK_REASONS } from '../../domain/menu/rollout/RolloutMetadata';

const ROLLOUT_ON: MenuProjectionRolloutFeatureFlagReader = () => true;
const ROLLOUT_OFF: MenuProjectionRolloutFeatureFlagReader = () => false;

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

describe('Menu projection rollout SDK (M7 PR-12)', () => {
  it('defaults FF_MENU_PROJECTION_ROLLOUT_ENABLED to off', () => {
    assert.equal(
      MENU_PROJECTION_ROLLOUT_FEATURE_FLAG_DEFAULTS.flags.FF_MENU_PROJECTION_ROLLOUT_ENABLED,
      false
    );
  });

  it('createMenuProjectionRollout resolves factory infrastructure', () => {
    const rollout = createMenuProjectionRollout({
      initialHealth: healthyHealth(),
    });
    assert.ok(rollout.policy);
    assert.ok(rollout.metrics);
    assert.ok(rollout.evaluator);
    assert.equal(rollout.decision, rollout.evaluator);
  });

  it('routes legacy when rollout flag is off', async () => {
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_OFF,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });

    const result = await rollout.evaluator.evaluateRouting('catalog-001');
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

    const result = await rollout.evaluator.evaluateRouting('catalog-001');
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

    const result = await rollout.evaluator.evaluateRouting('catalog-001');
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

    await rollout.evaluator.evaluateRouting('catalog-metrics');
    const snapshot = await rollout.metrics.getSnapshot();
    assert.equal(snapshot.ok, true);
    if (snapshot.ok) {
      assert.equal(snapshot.value.totalRequests, 1);
      assert.equal(snapshot.value.projectionRequests, 1);
      assert.equal(snapshot.value.legacyRequests, 0);
      assert.equal(snapshot.value.fallbackRequests, 0);
      assert.equal(snapshot.value.p95LatencyMs, 50);
      assert.equal(snapshot.value.repositoryHealthy, true);
      assert.equal(snapshot.value.parityHealthPercent, 100);
    }
  });

  it('records promotion and rollback metrics', async () => {
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: true },
    });

    await rollout.evaluator.promote();
    await rollout.evaluator.evaluateRouting('catalog-unhealthy');

    const unhealthyRollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: {
        ...healthyHealth(),
        projectionRepositoryHealthy: false,
      },
      initialConfiguration: { currentStage: 5, manualApprovalGranted: true },
    });
    await unhealthyRollout.evaluator.evaluateRouting('catalog-rollback');

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

  it('emits menu rollout telemetry events', async () => {
    const events: MenuProjectionRolloutTelemetryEvent[] = [];
    const rollout = createProjectionRolloutInfrastructure({
      featureFlags: ROLLOUT_ON,
      initialHealth: healthyHealth(),
      initialConfiguration: { currentStage: 0, manualApprovalGranted: true },
      onTelemetry: (event) => events.push(event),
    });

    await rollout.evaluator.evaluateRouting('catalog-telemetry');
    await rollout.evaluator.promote();

    assert.ok(events.some((event) => event.type === 'menu_projection_rollout_started'));
    assert.ok(events.some((event) => event.type === 'menu_projection_rollout_completed'));
    assert.ok(events.some((event) => event.type === 'menu_projection_rollout_promoted'));
    assert.ok(events.some((event) => event.type === 'menu_projection_rollout_stage_changed'));
  });

  it('evaluateRollback returns legacy recommendation when unhealthy', async () => {
    const rollout = createProjectionRolloutInfrastructure({
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
});
