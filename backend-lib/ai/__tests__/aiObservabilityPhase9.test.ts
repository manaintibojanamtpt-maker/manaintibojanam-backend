import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach } from 'node:test';
import { buildAiAuditEvent } from '../auditContracts.js';
import {
  AiMetricsCollector,
  emitAiAuditEvent,
  getAiObservabilitySnapshot,
  resetAiMetricsCollectorForTests,
} from '../aiMetricsCollector.js';
import { buildAiObservabilitySnapshot, buildWindowStats } from '../aiObservabilityContracts.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

describe('AI observability Phase 9', () => {
  beforeEach(() => {
    resetAiMetricsCollectorForTests();
  });

  it('builds window stats with latency percentiles and mutatedState false', () => {
    const now = Date.parse('2026-07-23T12:00:00.000Z');
    const samples = [
      {
        timestampMs: now - 1000,
        eventType: 'ai.assist.response' as const,
        success: true,
        safetyBlocked: false,
        latencyMs: 100,
        platform: 'web' as const,
        mode: 'consumer_ordering' as const,
      },
      {
        timestampMs: now - 500,
        eventType: 'ai.assist.provider_error' as const,
        success: false,
        safetyBlocked: false,
        latencyMs: 400,
        platform: 'marketing' as const,
        mode: 'merchant_marketing' as const,
      },
      {
        timestampMs: now - 100,
        eventType: 'ai.assist.blocked' as const,
        success: false,
        safetyBlocked: true,
        latencyMs: 200,
        platform: 'android' as const,
        mode: 'consumer_ordering' as const,
      },
    ];

    const window = buildWindowStats(samples, now - 60_000, now);
    assert.equal(window.totalEvents, 3);
    assert.equal(window.successCount, 1);
    assert.equal(window.failureCount, 2);
    assert.equal(window.safetyBlockedCount, 1);
    assert.equal(window.latency.count, 3);
    assert.equal(window.latency.p50Ms, 200);
    assert.equal(window.latency.p95Ms, 400);

    const snap = buildAiObservabilitySnapshot(samples, now);
    assert.equal(snap.schemaVersion, '20.0');
    assert.equal(snap.mutatedState, false);
    assert.equal(snap.persistence, 'in_process');
    assert.equal(snap.last1h.totalEvents, 3);
    assert.ok(snap.last1h.byCanaryBucket.none);
    assert.equal(snap.last1h.byCanaryBucket.none?.totalEvents, 3);
  });

  it('records audit emits into the collector and exposes snapshot', () => {
    const logged: Array<{ level: string; eventType: string }> = [];
    const log = {
      info: (payload: Record<string, unknown>) => {
        logged.push({ level: 'info', eventType: String(payload.eventType) });
      },
      warn: (payload: Record<string, unknown>) => {
        logged.push({ level: 'warn', eventType: String(payload.eventType) });
      },
      error: (payload: Record<string, unknown>) => {
        logged.push({ level: 'error', eventType: String(payload.eventType) });
      },
    };

    emitAiAuditEvent(log, 'info', {
      eventType: 'ai.assist.request',
      correlationId: 'c1',
      success: true,
      channel: 'orderbhojan_web',
      mode: 'consumer_ordering',
    });
    emitAiAuditEvent(log, 'info', {
      eventType: 'ai.assist.response',
      correlationId: 'c1',
      success: true,
      channel: 'orderbhojan_web',
      mode: 'consumer_ordering',
      latencyMs: 120,
    });

    const snap = getAiObservabilitySnapshot();
    assert.equal(snap.process.totalEvents, 2);
    assert.equal(snap.process.successCount, 2);
    assert.equal(snap.mutatedState, false);
    assert.deepEqual(
      logged.map((l) => l.eventType),
      ['ai.assist.request', 'ai.assist.response'],
    );
  });

  it('collector respects capacity ring buffer', () => {
    const collector = new AiMetricsCollector(3);
    for (let i = 0; i < 5; i += 1) {
      collector.record(
        buildAiAuditEvent({
          eventType: 'ai.assist.request',
          correlationId: `c${i}`,
          success: true,
        }),
      );
    }
    assert.equal(collector.size(), 3);
    assert.equal(collector.snapshot().process.totalEvents, 3);
  });

  it('status route exposes observability and ops route is registered', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    assert.match(gateway, /observabilityMetrics:\s*true/);
    assert.match(gateway, /observability:\s*getAiObservabilitySnapshot/);
    assert.match(gateway, /emitAiAuditEvent/);

    const ops = readFileSync(
      join(repoRoot, 'backend-lib/observability/registerOpsRoutes.ts'),
      'utf8',
    );
    assert.match(ops, /\/api\/ops\/ai\/summary/);
    assert.match(ops, /requireSuperadmin/);
  });

  it('Phase 9 ops route remains superadmin-only (UI mount is Phase 12)', () => {
    const ops = readFileSync(
      join(repoRoot, 'backend-lib/observability/registerOpsRoutes.ts'),
      'utf8',
    );
    assert.match(ops, /\/api\/ops\/ai\/summary/);
    assert.match(ops, /requireSuperadmin/);
  });

  it('ops client helper exists without enabling AI flags', () => {
    const api = readFileSync(join(repoRoot, 'src/lib/opsHealthApi.ts'), 'utf8');
    assert.match(api, /fetchAiOpsSummary/);
    assert.match(api, /\/api\/ops\/ai\/summary/);

    const features = readFileSync(join(repoRoot, 'src/config/features.ts'), 'utf8');
    assert.match(features, /aiMarketingAssistant:\s*false/);
  });
});
