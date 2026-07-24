import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach } from 'node:test';
import { buildAiAuditEvent } from '../auditContracts.js';
import {
  AiMetricsCollector,
  resetAiMetricsCollectorForTests,
} from '../aiMetricsCollector.js';
import { stableBucket } from '../rollout/aiRolloutPolicy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

describe('AI canary headers + slice observability Phase 20', () => {
  beforeEach(() => {
    resetAiMetricsCollectorForTests();
  });

  it('gateway status exposes phase 20 canary contracts', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    assert.match(gateway, /phase:\s*(?:20|21|[2-9]\d+)/);
    assert.match(gateway, /clientCanaryHeaders:\s*true/);
    assert.match(gateway, /canarySliceObservability:\s*true/);
    assert.match(gateway, /canaryAuditFields/);
    assert.match(gateway, /canaryBucket/);
  });

  it('audit events carry canary bucket and errorCode into metrics slices', () => {
    const collector = new AiMetricsCollector();
    const key = 'ob-cohort-deadbeef';
    const bucket = stableBucket(key);
    const now = Date.parse('2026-07-24T12:00:00.000Z');

    collector.record(
      buildAiAuditEvent({
        eventType: 'ai.assist.response',
        correlationId: 'c1',
        success: true,
        channel: 'orderbhojan_web',
        mode: 'consumer_ordering',
        latencyMs: 150,
        canaryRoutingKey: key,
        canaryBucket: bucket,
        canaryGateApplied: false,
        timestamp: new Date(now - 1000).toISOString(),
      }),
    );
    collector.record(
      buildAiAuditEvent({
        eventType: 'ai.assist.blocked',
        correlationId: 'c2',
        success: false,
        channel: 'orderbhojan_web',
        mode: 'consumer_ordering',
        latencyMs: 40,
        errorCode: 'AI_CANARY_EXCLUDED',
        canaryRoutingKey: key,
        canaryBucket: bucket,
        canaryGateApplied: true,
        canaryGateReason: 'OUTSIDE_BUCKET',
        timestamp: new Date(now - 500).toISOString(),
      }),
    );

    const snap = collector.snapshot(now);
    assert.equal(snap.schemaVersion, '20.0');
    const slice = snap.process.byCanaryBucket[String(bucket)];
    assert.ok(slice);
    assert.equal(slice?.totalEvents, 2);
    assert.equal(slice?.successCount, 1);
    assert.equal(slice?.failureCount, 1);
    assert.equal(slice?.latency.count, 2);
    assert.equal(snap.process.byErrorCode.AI_CANARY_EXCLUDED, 1);
    assert.equal(snap.mutatedState, false);
  });

  it('OrderBhojan canary flag defaults OFF and client wires attachment helpers', () => {
    const flags = readFileSync(join(repoRoot, 'orderbhojan/src/featureFlags/flags.ts'), 'utf8');
    const client = readFileSync(
      join(repoRoot, 'orderbhojan/src/features/assistant/infrastructure/assistantApiClient.ts'),
      'utf8',
    );
    const cohort = readFileSync(
      join(repoRoot, 'orderbhojan/src/features/assistant/domain/resolveAiCanaryCohortKey.ts'),
      'utf8',
    );
    const env = readFileSync(join(repoRoot, 'orderbhojan/.env.example'), 'utf8');

    assert.match(flags, /FF_OB_AI_CANARY_HEADERS/);
    assert.match(flags, /FF_OB_AI_CANARY_HEADERS:\s*false/);
    assert.match(client, /buildAiCanaryRequestAttachment|withCanaryBody/);
    assert.match(client, /routingKey/);
    assert.match(cohort, /ob-cohort-/);
    assert.match(env, /VITE_FF_OB_AI_CANARY_HEADERS=false/);
  });
});
