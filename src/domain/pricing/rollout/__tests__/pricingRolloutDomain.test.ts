import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  evaluateRolloutPromotion,
  evaluateRolloutRollback,
  evaluateRolloutRouting,
} from '../RolloutPolicy';
import { ROLLOUT_BLOCK_REASONS, ROLLOUT_ROLLBACK_REASONS } from '../RolloutMetadata';
import { getNextRolloutStage, ROLLOUT_STAGES } from '../RolloutStage';
import type { RolloutHealthSnapshot } from '../RolloutHealth';

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

describe('Pricing rollout domain (M8 PR-12)', () => {
  it('defines explicit rollout stages 0 through 5', () => {
    assert.equal(ROLLOUT_STAGES.length, 6);
    assert.deepEqual(
      ROLLOUT_STAGES.map((stage) => stage.projectionPercent),
      [0, 1, 5, 25, 50, 100]
    );
  });

  it('getNextRolloutStage requires explicit promotion', () => {
    assert.equal(getNextRolloutStage(0), 1);
    assert.equal(getNextRolloutStage(4), 5);
    assert.equal(getNextRolloutStage(5), null);
  });

  it('evaluateRolloutRollback triggers on projection unavailable', () => {
    const decision = evaluateRolloutRollback({
      ...healthyHealth(),
      projectionRepositoryHealthy: false,
    });
    assert.equal(decision.required, true);
    assert.equal(decision.reason, ROLLOUT_ROLLBACK_REASONS.PROJECTION_UNAVAILABLE);
  });

  it('evaluateRolloutRollback triggers on parity below threshold', () => {
    const decision = evaluateRolloutRollback({
      ...healthyHealth(),
      parityPercent: 90,
    });
    assert.equal(decision.required, true);
    assert.equal(decision.reason, ROLLOUT_ROLLBACK_REASONS.PARITY_BELOW_THRESHOLD);
  });

  it('evaluateRolloutRollback triggers on operational RED', () => {
    const decision = evaluateRolloutRollback({
      ...healthyHealth(),
      operationalHealth: 'RED',
    });
    assert.equal(decision.required, true);
    assert.equal(decision.reason, ROLLOUT_ROLLBACK_REASONS.OPERATIONAL_RED);
  });

  it('evaluateRolloutRollback triggers on fallback rate exceeded', () => {
    const decision = evaluateRolloutRollback({
      ...healthyHealth(),
      fallbackRatePercent: 5,
    });
    assert.equal(decision.required, true);
    assert.equal(decision.reason, ROLLOUT_ROLLBACK_REASONS.FALLBACK_RATE_EXCEEDED);
  });

  it('evaluateRolloutRollback triggers on P95 latency exceeded', () => {
    const decision = evaluateRolloutRollback({
      ...healthyHealth(),
      p95LatencyMs: 800,
    });
    assert.equal(decision.required, true);
    assert.equal(decision.reason, ROLLOUT_ROLLBACK_REASONS.LATENCY_EXCEEDED);
  });

  it('evaluateRolloutPromotion blocks without manual approval', () => {
    const decision = evaluateRolloutPromotion({
      rolloutFlagEnabled: true,
      currentStage: 0,
      manualApprovalGranted: false,
      health: healthyHealth(),
    });
    assert.equal(decision.allowed, false);
    assert.ok(decision.blockers.includes(ROLLOUT_BLOCK_REASONS.MANUAL_APPROVAL_REQUIRED));
  });

  it('evaluateRolloutPromotion blocks when flag disabled', () => {
    const decision = evaluateRolloutPromotion({
      rolloutFlagEnabled: false,
      currentStage: 0,
      manualApprovalGranted: true,
      health: healthyHealth(),
    });
    assert.equal(decision.allowed, false);
    assert.ok(decision.blockers.includes(ROLLOUT_BLOCK_REASONS.FLAG_DISABLED));
  });

  it('evaluateRolloutPromotion blocks when projection not ready', () => {
    const decision = evaluateRolloutPromotion({
      rolloutFlagEnabled: true,
      currentStage: 0,
      manualApprovalGranted: true,
      health: { ...healthyHealth(), projectionReady: false },
    });
    assert.equal(decision.allowed, false);
    assert.ok(decision.blockers.includes(ROLLOUT_BLOCK_REASONS.PROJECTION_NOT_READY));
  });

  it('evaluateRolloutPromotion allows when all gates pass', () => {
    const decision = evaluateRolloutPromotion({
      rolloutFlagEnabled: true,
      currentStage: 0,
      manualApprovalGranted: true,
      health: healthyHealth(),
    });
    assert.equal(decision.allowed, true);
    assert.equal(decision.toStage, 1);
  });

  it('evaluateRolloutRouting returns legacy when flag off', () => {
    const decision = evaluateRolloutRouting({
      rolloutFlagEnabled: false,
      currentStage: 5,
      manualApprovalGranted: true,
      health: healthyHealth(),
      routingKey: 'price-list-001',
    });
    assert.equal(decision.route, 'legacy');
    assert.equal(decision.reason, ROLLOUT_BLOCK_REASONS.FLAG_DISABLED);
  });

  it('evaluateRolloutRouting returns legacy at stage 0', () => {
    const decision = evaluateRolloutRouting({
      rolloutFlagEnabled: true,
      currentStage: 0,
      manualApprovalGranted: true,
      health: healthyHealth(),
      routingKey: 'price-list-001',
    });
    assert.equal(decision.route, 'legacy');
    assert.equal(decision.reason, ROLLOUT_BLOCK_REASONS.STAGE_ZERO);
  });

  it('evaluateRolloutRouting routes projection at stage 5', () => {
    const decision = evaluateRolloutRouting({
      rolloutFlagEnabled: true,
      currentStage: 5,
      manualApprovalGranted: true,
      health: healthyHealth(),
      routingKey: 'price-list-001',
    });
    assert.equal(decision.route, 'projection');
    assert.equal(decision.rollback, false);
  });

  it('evaluateRolloutRouting is deterministic for routing key', () => {
    const context = {
      rolloutFlagEnabled: true,
      currentStage: 3 as const,
      manualApprovalGranted: true,
      health: healthyHealth(),
      routingKey: 'stable-price-list-key',
    };
    const first = evaluateRolloutRouting(context);
    const second = evaluateRolloutRouting(context);
    assert.equal(first.route, second.route);
    assert.equal(first.bucket, second.bucket);
  });
});
