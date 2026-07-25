import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { readAiCanaryRolloutConfig } from '../rollout/aiRolloutConfig.js';
import {
  evaluateAiCanaryAssistGate,
  resolveAiCanaryRoutingKey,
  stableBucket,
} from '../rollout/aiRolloutPolicy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

describe('AI canary assist gate Phase 13', () => {
  it('defaults keep assist ungated (allow, not applied)', () => {
    const config = readAiCanaryRolloutConfig({});
    const gate = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: config.enabled,
      stage: config.stage,
      routingKey: 'any',
      wiredIntoAssist: config.wiredIntoAssist,
    });
    assert.equal(gate.allow, true);
    assert.equal(gate.applied, false);
  });

  it('wired but inactive (flag OFF or stage 0) still allows all traffic', () => {
    const off = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: false,
      stage: 5,
      routingKey: 'k',
      wiredIntoAssist: true,
    });
    assert.equal(off.allow, true);
    assert.equal(off.applied, false);
    assert.equal(off.decision.reason, 'CANARY_INACTIVE');

    const stage0 = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: true,
      stage: 0,
      routingKey: 'k',
      wiredIntoAssist: true,
    });
    assert.equal(stage0.allow, true);
    assert.equal(stage0.applied, false);
  });

  it('wired + enabled + stage>0 applies bucket filter', () => {
    let inKey = '';
    let outKey = '';
    for (let i = 0; i < 20_000; i += 1) {
      const key = `p13-${i}`;
      const b = stableBucket(key);
      if (!inKey && b < 1) inKey = key;
      if (!outKey && b >= 1) outKey = key;
      if (inKey && outKey) break;
    }
    assert.ok(inKey && outKey);

    const allowed = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: true,
      stage: 1,
      routingKey: inKey,
      wiredIntoAssist: true,
      healthOk: true,
    });
    assert.equal(allowed.allow, true);
    assert.equal(allowed.applied, true);

    const excluded = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: true,
      stage: 1,
      routingKey: outKey,
      wiredIntoAssist: true,
      healthOk: true,
    });
    assert.equal(excluded.allow, false);
    assert.equal(excluded.decision.reason, 'OUTSIDE_BUCKET');
  });

  it('health gate hard-blocks canary stages when unhealthy', () => {
    const gate = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: true,
      stage: 1,
      routingKey: 'healthy-key',
      wiredIntoAssist: true,
      healthOk: false,
    });
    assert.equal(gate.allow, false);
    assert.equal(gate.decision.reason, 'HEALTH_GATE');
  });

  it('stage 5 (100%) treats health as advisory — does not hard-block assist', () => {
    const gate = evaluateAiCanaryAssistGate({
      canaryFlagEnabled: true,
      stage: 5,
      routingKey: 'healthy-key',
      wiredIntoAssist: true,
      healthOk: false,
    });
    assert.equal(gate.allow, true);
    assert.equal(gate.applied, true);
    assert.equal(gate.decision.healthOk, false);
  });

  it('resolves routing key precedence', () => {
    assert.equal(
      resolveAiCanaryRoutingKey({
        explicitKey: ' explicit ',
        conversationId: 'c1',
        correlationId: 'x1',
      }),
      'explicit',
    );
    assert.equal(
      resolveAiCanaryRoutingKey({ conversationId: 'c1', correlationId: 'x1' }),
      'c1',
    );
    assert.equal(resolveAiCanaryRoutingKey({ correlationId: 'x1' }), 'x1');
  });

  it('assist and cart-plan routes call evaluateAiCanaryAssistGate', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    assert.match(gateway, /phase:\s*(?:1[3-9]|[2-9]\d+)/);
    assert.match(gateway, /aiCanaryAssistGate:\s*true/);
    assert.match(gateway, /evaluateAiCanaryAssistGate/);
    assert.match(gateway, /AI_CANARY_EXCLUDED/);

    const assist = gateway.slice(gateway.indexOf("app.post('/api/ai/v1/assist'"));
    const cart = gateway.slice(
      gateway.indexOf("app.post('/api/ai/v1/consumer/cart-plan/validate'"),
    );
    assert.match(assist, /evaluateAiCanaryAssistGate/);
    assert.match(cart, /evaluateAiCanaryAssistGate/);
  });

  it('defaults documented in .env.example keep canary unwired', () => {
    const env = readFileSync(join(repoRoot, '.env.example'), 'utf8');
    assert.match(env, /AI_CANARY_WIRED_INTO_ASSIST/);
    assert.match(env, /AI_CANARY_ROLLOUT_ENABLED=false/);
  });
});
