import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { readAiCanaryRolloutConfig } from '../rollout/aiRolloutConfig.js';
import { buildAiCanaryRolloutSnapshot } from '../rollout/aiRolloutContracts.js';
import {
  evaluateAiCanaryRollout,
  evaluateAiRolloutHealth,
  stableBucket,
} from '../rollout/aiRolloutPolicy.js';
import { AI_ROLLOUT_STAGES } from '../rollout/aiRolloutStages.js';
import type { AiObservabilitySnapshot } from '../aiObservabilityContracts.js';

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

describe('AI canary rollout Phase 11', () => {
  it('defaults canary flag OFF, stage 0, and unwired', () => {
    const config = readAiCanaryRolloutConfig({});
    assert.equal(config.enabled, false);
    assert.equal(config.stage, 0);
    assert.equal(config.wiredIntoAssist, false);
    assert.equal(config.liveRolloutGatesEnabled, false);
  });

  it('reads wired flag only when AI_CANARY_WIRED_INTO_ASSIST=true', () => {
    assert.equal(readAiCanaryRolloutConfig({ AI_CANARY_WIRED_INTO_ASSIST: 'true' }).wiredIntoAssist, true);
    assert.equal(readAiCanaryRolloutConfig({ AI_CANARY_WIRED_INTO_ASSIST: 'false' }).wiredIntoAssist, false);
  });

  it('uses stable percentage buckets matching pricing pattern', () => {
    assert.equal(AI_ROLLOUT_STAGES.map((s) => s.percent).join(','), '0,1,5,25,50,100');
    const a = stableBucket('tenant-a');
    const b = stableBucket('tenant-a');
    assert.equal(a, b);
    assert.ok(a >= 0 && a < 100);
  });

  it('blocks when flag OFF, stage 0, or not wired — even if key would be in bucket', () => {
    assert.equal(
      evaluateAiCanaryRollout({
        canaryFlagEnabled: false,
        stage: 5,
        routingKey: 'k1',
        wiredIntoAssist: true,
      }).reason,
      'FLAG_DISABLED',
    );

    assert.equal(
      evaluateAiCanaryRollout({
        canaryFlagEnabled: true,
        stage: 0,
        routingKey: 'k1',
        wiredIntoAssist: true,
      }).reason,
      'STAGE_ZERO',
    );

    assert.equal(
      evaluateAiCanaryRollout({
        canaryFlagEnabled: true,
        stage: 5,
        routingKey: 'k1',
        wiredIntoAssist: false,
      }).reason,
      'NOT_WIRED_INTO_ASSIST',
    );
  });

  it('allows only when wired + flag ON + stage > 0 + in bucket + healthy', () => {
    // Find a key that hashes into the 1% canary bucket
    let inBucketKey = '';
    for (let i = 0; i < 10_000; i += 1) {
      const key = `probe-${i}`;
      if (stableBucket(key) < 1) {
        inBucketKey = key;
        break;
      }
    }
    assert.ok(inBucketKey, 'expected to find a 1% bucket key');

    const allowed = evaluateAiCanaryRollout({
      canaryFlagEnabled: true,
      stage: 1,
      routingKey: inBucketKey,
      wiredIntoAssist: true,
      healthOk: true,
    });
    assert.equal(allowed.route, 'allowed');
    assert.equal(allowed.reason, 'IN_BUCKET');

    let outsideKey = '';
    for (let i = 0; i < 10_000; i += 1) {
      const key = `out-${i}`;
      if (stableBucket(key) >= 1) {
        outsideKey = key;
        break;
      }
    }
    assert.ok(outsideKey);
    const outside = evaluateAiCanaryRollout({
      canaryFlagEnabled: true,
      stage: 1,
      routingKey: outsideKey,
      wiredIntoAssist: true,
      healthOk: true,
    });
    assert.equal(outside.route, 'blocked');
    assert.equal(outside.reason, 'OUTSIDE_BUCKET');
  });

  it('health gate trips on high failure rate with enough samples', () => {
    const snap: AiObservabilitySnapshot = {
      schemaVersion: '20.0',
      generatedAt: new Date().toISOString(),
      mutatedState: false,
      persistence: 'in_process',
      process: emptyWindow({ totalEvents: 100, successCount: 50, failureCount: 50 }),
      last1h: emptyWindow({ totalEvents: 100, successCount: 50, failureCount: 50 }),
      last24h: emptyWindow({ totalEvents: 100, successCount: 50, failureCount: 50 }),
    };
    const health = evaluateAiRolloutHealth(snap);
    assert.equal(health.ok, false);
  });

  it('snapshot is mutatedState false and defaults unwired', () => {
    const snap = buildAiCanaryRolloutSnapshot({
      AI_CANARY_ROLLOUT_ENABLED: undefined,
      AI_CANARY_ROLLOUT_STAGE: undefined,
      AI_CANARY_WIRED_INTO_ASSIST: undefined,
    });
    assert.equal(snap.mutatedState, false);
    assert.equal(snap.wiredIntoAssist, false);
    assert.equal(snap.canaryFlagEnabled, false);
    assert.equal(snap.currentStage, 0);
    assert.equal(snap.sampleAssistGate.allow, true);
    assert.equal(snap.sampleAssistGate.applied, false);
  });

  it('gateway status exposes rollout policy contract', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    assert.match(gateway, /aiCanaryRolloutPolicy:\s*true/);
    assert.match(gateway, /buildAiCanaryRolloutSnapshot/);
  });

  it('SystemHealth AI panel is read-only (no canary stage mutation controls)', () => {
    const health = readFileSync(join(repoRoot, 'src/pages/SystemHealth.tsx'), 'utf8');
    const panel = readFileSync(join(repoRoot, 'src/components/ops/AiOpsPanel.tsx'), 'utf8');
    assert.doesNotMatch(health, /AI_CANARY_ROLLOUT_ENABLED|setStage|promoteCanary/i);
    assert.doesNotMatch(panel, /AI_CANARY_ROLLOUT_ENABLED|setStage|promoteCanary|onClick=\{.*stage/i);
  });
});
