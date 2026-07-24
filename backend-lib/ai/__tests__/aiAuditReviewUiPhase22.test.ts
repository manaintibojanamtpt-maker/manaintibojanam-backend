import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

describe('AI audit review UI Phase 22', () => {
  it('gateway status exposes phase 22 audit review contract', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    assert.match(gateway, /phase:\s*(?:22|23|[2-9]\d+)/);
    assert.match(gateway, /aiAuditReviewUi:\s*true/);
  });

  it('ops audit-events API stays mutatedState false and supports review filters', () => {
    const ops = readFileSync(
      join(repoRoot, 'backend-lib/observability/registerOpsRoutes.ts'),
      'utf8',
    );
    const repo = readFileSync(
      join(repoRoot, 'backend-lib/ai/aiAuditEventRepository.ts'),
      'utf8',
    );
    assert.match(ops, /\/api\/ops\/ai\/audit-events/);
    assert.match(ops, /mutatedState:\s*false/);
    assert.match(ops, /requireSuperadmin/);
    assert.match(ops, /eventTypes|canaryBucket|safetyBlocked|errorCode/);
    assert.match(repo, /eventTypes/);
    assert.match(repo, /canaryBucket/);
    assert.match(repo, /safetyBlocked/);
  });

  it('SystemHealth mounts AiAuditReviewPanel and keeps review read-only', () => {
    const health = readFileSync(join(repoRoot, 'src/pages/SystemHealth.tsx'), 'utf8');
    const panel = readFileSync(
      join(repoRoot, 'src/components/ops/AiAuditReviewPanel.tsx'),
      'utf8',
    );
    const api = readFileSync(join(repoRoot, 'src/lib/opsHealthApi.ts'), 'utf8');

    assert.match(health, /AiAuditReviewPanel/);
    assert.match(panel, /Read-only|review only/i);
    assert.match(panel, /data-testid="ai-audit-review-panel"/);
    assert.match(panel, /fetchAiAuditEvents/);
    assert.match(panel, /confirm_discard|Confirm \/ discard/);
    assert.match(panel, /byCanaryBucket|Canary buckets/);
    assert.doesNotMatch(panel, /AI_GATEWAY_ENABLED|setStage|enableGateway|AI_CANARY_ROLLOUT_ENABLED/i);
    assert.doesNotMatch(panel, /type=\"checkbox\"/);
    assert.doesNotMatch(panel, /\/api\/ai\/v1\/assist|openrouter/i);
    assert.doesNotMatch(health, /\/api\/ai\/v1\/assist/);
    assert.match(api, /fetchAiAuditEvents/);
    assert.match(api, /\/api\/ops\/ai\/audit-events/);
  });
});
