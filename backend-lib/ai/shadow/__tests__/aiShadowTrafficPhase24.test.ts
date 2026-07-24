import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it, beforeEach, afterEach } from 'node:test';
import { buildAiAuditEvent } from '../../auditContracts.js';
import { readAiShadowTrafficConfig } from '../../aiShadowTrafficConfig.js';
import {
  emitAiAuditEvent,
  resetAiMetricsCollectorForTests,
} from '../../aiMetricsCollector.js';
import {
  aiShadowSampleCount,
  resetAiShadowTrafficStoreForTests,
} from '../aiShadowTrafficStore.js';
import { auditEventToShadowSample, maybeCaptureAiShadowSample } from '../captureAiShadowSample.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');

describe('AI shadow traffic Phase 24', () => {
  const prevShadow = process.env.AI_SHADOW_TRAFFIC_ENABLED;
  const prevSampleRate = process.env.AI_SHADOW_TRAFFIC_SAMPLE_RATE;

  beforeEach(() => {
    resetAiMetricsCollectorForTests();
    resetAiShadowTrafficStoreForTests();
  });

  afterEach(() => {
    if (prevShadow === undefined) delete process.env.AI_SHADOW_TRAFFIC_ENABLED;
    else process.env.AI_SHADOW_TRAFFIC_ENABLED = prevShadow;
    if (prevSampleRate === undefined) delete process.env.AI_SHADOW_TRAFFIC_SAMPLE_RATE;
    else process.env.AI_SHADOW_TRAFFIC_SAMPLE_RATE = prevSampleRate;
    resetAiMetricsCollectorForTests();
    resetAiShadowTrafficStoreForTests();
  });

  it('defaults AI_SHADOW_TRAFFIC_ENABLED OFF', () => {
    assert.equal(readAiShadowTrafficConfig({}).enabled, false);
    assert.equal(readAiShadowTrafficConfig({ AI_SHADOW_TRAFFIC_ENABLED: 'true' }).enabled, true);
    assert.equal(readAiShadowTrafficConfig({}).persistenceEnabled, false);
  });

  it('captures assist-shaped audit events only when flag ON', () => {
    process.env.AI_SHADOW_TRAFFIC_ENABLED = 'true';
    process.env.AI_SHADOW_TRAFFIC_SAMPLE_RATE = '1';

    const event = buildAiAuditEvent({
      eventType: 'ai.assist.request',
      correlationId: 'corr-1',
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      success: true,
      messagePreview: 'add biryani',
    });
    maybeCaptureAiShadowSample(event);
    assert.equal(aiShadowSampleCount(), 1);

    const sample = auditEventToShadowSample(event);
    assert.ok(sample);
    assert.equal(sample.request.message, 'add biryani');
    assert.equal(sample.audit.sourceEventType, 'ai.assist.request');
  });

  it('does not capture when shadow flag OFF', () => {
    delete process.env.AI_SHADOW_TRAFFIC_ENABLED;
    emitAiAuditEvent(undefined, 'info', {
      eventType: 'ai.assist.request',
      correlationId: 'corr-off',
      mode: 'consumer_ordering',
      channel: 'orderbhojan_web',
      success: true,
      messagePreview: 'hello',
    });
    assert.equal(aiShadowSampleCount(), 0);
  });

  it('wires capture from emitAiAuditEvent and ops shadow routes', () => {
    const metrics = readFileSync(join(repoRoot, 'backend-lib/ai/aiMetricsCollector.ts'), 'utf8');
    const ops = readFileSync(join(repoRoot, 'backend-lib/observability/registerOpsRoutes.ts'), 'utf8');
    const shadow = readFileSync(join(repoRoot, 'backend-lib/ai/shadow/registerAiShadowRoutes.ts'), 'utf8');
    const gateway = readFileSync(join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'), 'utf8');

    assert.match(metrics, /maybeCaptureAiShadowSample/);
    assert.match(ops, /registerAiShadowRoutes/);
    assert.match(shadow, /\/api\/ops\/ai\/shadow\/samples/);
    assert.match(shadow, /\/api\/ops\/ai\/shadow\/replay/);
    assert.match(shadow, /compareShadowBatch/);
    assert.match(gateway, /phase:\s*(?:24|25|[2-9]\d+)/);
    assert.match(gateway, /shadowTrafficValidation:\s*true/);
    assert.match(gateway, /shadowTrafficReplay:\s*true/);

    const panel = readFileSync(
      join(repoRoot, 'src/components/ops/AiShadowTrafficPanel.tsx'),
      'utf8',
    );
    const health = readFileSync(join(repoRoot, 'src/pages/SystemHealth.tsx'), 'utf8');
    assert.match(panel, /data-testid="ai-shadow-traffic-panel"/);
    assert.match(panel, /Read-only|review only/i);
    assert.doesNotMatch(panel, /AI_GATEWAY_ENABLED|setStage|enableGateway/i);
    assert.match(health, /AiShadowTrafficPanel/);
  });
});
