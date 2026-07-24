import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import type { AiObservabilitySnapshot } from '../aiObservabilityContracts.js';
import { resetLastGoldenEvalReportForTests } from '../eval/lastGoldenEvalStore.js';
import { readAiCanaryRolloutConfig } from '../rollout/aiRolloutConfig.js';
import {
  AI_ROLLOUT_SCHEMA_VERSION,
  buildAiCanaryRolloutSnapshot,
} from '../rollout/aiRolloutContracts.js';
import { AI_CANARY_PROMOTION_BLOCKERS } from '../rollout/aiRolloutMetadata.js';
import {
  evaluateAiCanaryHaltGate,
  evaluateAiCanaryPromotionGate,
  evaluateAiCanaryRollbackDecision,
} from '../rollout/aiRolloutPolicy.js';
import {
  evaluateGoldenPrecheck,
  evaluateShadowPrecheck,
  measureCanaryErrorRate,
} from '../rollout/aiRolloutPrechecks.js';
import {
  getNextAiRolloutStage,
  getPreviousAiRolloutStage,
} from '../rollout/aiRolloutStages.js';
import { resetLastShadowCompareReportForTests } from '../shadow/lastShadowCompareStore.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

function emptyWindow(overrides: Partial<AiObservabilitySnapshot['process']> = {}) {
  return {
    since: new Date().toISOString(),
    totalEvents: 0,
    successCount: 0,
    failureCount: 0,
    safetyBlockedCount: 0,
    byEventType: {},
    byPlatform: {},
    byMode: {},
    byCanaryBucket: {
      none: {
        totalEvents: 0,
        successCount: 0,
        failureCount: 0,
        safetyBlockedCount: 0,
        latency: { count: 0, avgMs: null, p50Ms: null, p95Ms: null },
      },
    },
    byErrorCode: {},
    latency: { count: 0, avgMs: null, p50Ms: null, p95Ms: null },
    ...overrides,
  };
}

function obs(windowOverrides: Partial<AiObservabilitySnapshot['process']> = {}): AiObservabilitySnapshot {
  const w = emptyWindow(windowOverrides);
  return {
    schemaVersion: '20.0',
    generatedAt: new Date().toISOString(),
    mutatedState: false,
    persistence: 'in_process',
    process: w,
    last1h: w,
    last24h: w,
  };
}

describe('AI live canary rollout gates Phase 25', () => {
  it('defaults live rollout gates OFF', () => {
    const config = readAiCanaryRolloutConfig({});
    assert.equal(config.liveRolloutGatesEnabled, false);
  });

  it('stage helpers step 0→1→…→5 and back', () => {
    assert.equal(getNextAiRolloutStage(0), 1);
    assert.equal(getNextAiRolloutStage(5), null);
    assert.equal(getPreviousAiRolloutStage(1), 0);
    assert.equal(getPreviousAiRolloutStage(0), 0);
  });

  it('golden env override and shadow insufficient samples', () => {
    assert.equal(
      evaluateGoldenPrecheck({
        gatesEnabled: true,
        envOverride: 'true',
        minPassRate: 1,
      }).status,
      'pass',
    );
    assert.equal(
      evaluateShadowPrecheck({
        gatesEnabled: true,
        shadowCaptureEnabled: false,
        report: {
          schemaVersion: '24.0',
          mutatedState: false,
          total: 2,
          passed: 2,
          failed: 0,
          driftCount: 0,
          results: [],
        },
        thresholds: { shadowMinSamples: 10, shadowMaxDriftRate: 0.05 },
      }).blockerCode,
      AI_CANARY_PROMOTION_BLOCKERS.SHADOW_INSUFFICIENT,
    );
  });

  it('halt on canary error-code spike; rollback on shadow drift', () => {
    const unhealthy = obs({
      totalEvents: 100,
      successCount: 70,
      failureCount: 10,
      byErrorCode: { AI_CANARY_EXCLUDED: 20 },
    });
    const halt = evaluateAiCanaryHaltGate({ observability: unhealthy });
    assert.equal(halt.haltRecommended, true);
    assert.equal(halt.advisoryOnly, true);

    const measured = measureCanaryErrorRate(unhealthy, 20);
    assert.ok(measured.ratePercent > 10);

    const rollback = evaluateAiCanaryRollbackDecision({
      currentStage: 2,
      observability: obs({ totalEvents: 5 }),
      shadowDriftRate: 0.5,
    });
    assert.equal(rollback.required, true);
    assert.equal(rollback.recommendedStage, 1);
    assert.equal(rollback.advisoryOnly, true);
  });

  it('promotion requires gates + wiring + approval + prechecks; never mutates', () => {
    const blocked = evaluateAiCanaryPromotionGate({
      liveRolloutGatesEnabled: false,
      canaryFlagEnabled: true,
      wiredIntoAssist: true,
      currentStage: 1,
      manualApprovalGranted: true,
      gatewayReady: true,
      observability: obs({ totalEvents: 5 }),
      golden: { status: 'pass', reason: 'ok' },
      shadow: { status: 'pass', reason: 'ok' },
      stageSetAt: new Date(Date.now() - 48 * 3_600_000).toISOString(),
    });
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.blockers.includes(AI_CANARY_PROMOTION_BLOCKERS.GATES_DISABLED));
    assert.equal(blocked.advisoryOnly, true);

    const cleared = evaluateAiCanaryPromotionGate({
      liveRolloutGatesEnabled: true,
      canaryFlagEnabled: true,
      wiredIntoAssist: true,
      currentStage: 1,
      manualApprovalGranted: true,
      gatewayReady: true,
      observability: obs({ totalEvents: 5 }),
      golden: { status: 'pass', reason: 'ok' },
      shadow: { status: 'pass', reason: 'ok' },
      stageSetAt: new Date(Date.now() - 48 * 3_600_000).toISOString(),
    });
    assert.equal(cleared.allowed, true);
    assert.equal(cleared.toStage, 2);
  });

  it('snapshot schema 25.0 is advisory and safe by default', () => {
    resetLastShadowCompareReportForTests();
    resetLastGoldenEvalReportForTests();
    const snap = buildAiCanaryRolloutSnapshot({
      AI_CANARY_ROLLOUT_ENABLED: undefined,
      AI_CANARY_ROLLOUT_STAGE: undefined,
      AI_CANARY_WIRED_INTO_ASSIST: undefined,
      AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED: undefined,
    });
    assert.equal(snap.schemaVersion, AI_ROLLOUT_SCHEMA_VERSION);
    assert.equal(snap.mutatedState, false);
    assert.equal(snap.liveRolloutGatesEnabled, false);
    assert.equal(snap.promotion.allowed, false);
    assert.equal(snap.promotion.advisoryOnly, true);
    assert.equal(snap.halt.advisoryOnly, true);
    assert.equal(snap.rollback.advisoryOnly, true);
    assert.equal(snap.prechecks.golden.status, 'skipped');
    assert.equal(snap.sampleAssistGate.allow, true);
    assert.equal(snap.advancement.autoPromote, false);
    assert.equal(snap.advancement.requiresHumanApproval, true);
    assert.equal(snap.advancement.method, 'manual_env');
    assert.equal(snap.advancement.manualApprovalGranted, false);
  });

  it('gateway status exposes Phase 25 live gates contract', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    assert.match(gateway, /phase:\s*25/);
    assert.match(gateway, /aiCanaryLiveRolloutGates:\s*true/);
  });

  it('ops UI remains read-only (no stage mutation controls)', () => {
    const panel = readFileSync(join(repoRoot, 'src/components/ops/AiOpsPanel.tsx'), 'utf8');
    assert.match(panel, /ai-live-rollout-gates/);
    assert.doesNotMatch(panel, /setStage|promoteCanary|AI_CANARY_ROLLOUT_STAGE\s*=/i);
  });

  it('env example documents Phase 25 gates OFF by default', () => {
    const env = readFileSync(join(repoRoot, '.env.example'), 'utf8');
    assert.match(env, /AI_CANARY_LIVE_ROLLOUT_GATES_ENABLED=false/);
    assert.match(env, /AI_CANARY_MANUAL_APPROVAL_GRANTED=false/);
  });
});
