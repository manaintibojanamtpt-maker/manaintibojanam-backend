import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../..');

describe('AI ops dashboard Phase 12', () => {
  it('ops summary includes gateway + rollout and stays mutatedState false', () => {
    const ops = readFileSync(
      join(repoRoot, 'backend-lib/observability/registerOpsRoutes.ts'),
      'utf8',
    );
    assert.match(ops, /schemaVersion:\s*'(?:12|21|22)\.0'/);
    assert.match(ops, /mutatedState:\s*false/);
    assert.match(ops, /buildAiCanaryRolloutSnapshot/);
    assert.match(ops, /readAiGatewayConfig/);
    assert.match(ops, /requireSuperadmin/);
  });

  it('SystemHealth mounts AiOpsPanel via loadOpsDashboardSnapshot.aiSummary', () => {
    const health = readFileSync(join(repoRoot, 'src/pages/SystemHealth.tsx'), 'utf8');
    assert.match(health, /AiOpsPanel/);
    assert.match(health, /aiSummary/);
    assert.match(health, /loadOpsDashboardSnapshot/);
    assert.doesNotMatch(health, /\/api\/ai\/v1\/assist/);
    assert.doesNotMatch(health, /openrouter/i);
  });

  it('AiOpsPanel is read-only (no enable toggles or assist calls)', () => {
    const panel = readFileSync(join(repoRoot, 'src/components/ops/AiOpsPanel.tsx'), 'utf8');
    assert.match(panel, /Read-only/);
    assert.doesNotMatch(panel, /AI_GATEWAY_ENABLED|VITE_FF_|fetch\(.*assist/);
    assert.doesNotMatch(panel, /type=\"checkbox\"|setStage|enableGateway/i);
  });

  it('ops client loads ai summary in dashboard snapshot', () => {
    const api = readFileSync(join(repoRoot, 'src/lib/opsHealthApi.ts'), 'utf8');
    assert.match(api, /fetchAiOpsSummary/);
    assert.match(api, /aiSummary/);
    assert.match(api, /\/api\/ops\/ai\/summary/);
  });

  it('gateway status advertises ops UI contract', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    assert.match(gateway, /aiOpsDashboardUi:\s*true/);
  });
});
