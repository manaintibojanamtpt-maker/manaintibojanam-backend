import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import { AI_EVAL_FIXTURE_SET_VERSION, AI_EVAL_SCHEMA_VERSION, readAiEvalConfig } from '../../aiEvalConfig.js';
import { loadGoldenCases } from '../loadFixtures.js';
import { runGoldenEval } from '../runGoldenEval.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../../../..');

describe('AI offline golden eval harness Phase 23', () => {
  it('defaults AI_EVAL_HARNESS_ENABLED OFF', () => {
    assert.equal(readAiEvalConfig({}).harnessEnabled, false);
    assert.equal(readAiEvalConfig({ AI_EVAL_HARNESS_ENABLED: 'true' }).harnessEnabled, true);
  });

  it('loads versioned golden fixtures covering required categories', () => {
    const cases = loadGoldenCases(AI_EVAL_FIXTURE_SET_VERSION);
    assert.ok(cases.length >= 20, `expected >= 20 cases, got ${cases.length}`);
    const categories = new Set(cases.map((c) => c.category));
    for (const required of [
      'intent',
      'structured-output',
      'safety',
      'cart-plan-parse',
      'clarification',
      'triage',
      'personalization',
    ]) {
      assert.ok(categories.has(required as never), `missing category ${required}`);
    }
  });

  it('runs the full golden set with zero failures (offline)', () => {
    const report = runGoldenEval();
    assert.equal(report.schemaVersion, AI_EVAL_SCHEMA_VERSION);
    assert.equal(report.fixtureSetVersion, AI_EVAL_FIXTURE_SET_VERSION);
    assert.equal(report.mutatedState, false);
    if (report.failed > 0) {
      const failures = report.results
        .filter((r) => !r.ok)
        .map((r) => `${r.category}/${r.id}: ${r.errors.join('; ')}`)
        .join('\n');
      assert.fail(`Golden eval failures (${report.failed}):\n${failures}`);
    }
    assert.equal(report.passed, report.total);
  });

  it('gateway status exposes phase 23 offline eval contracts', () => {
    const gateway = readFileSync(
      join(repoRoot, 'backend-lib/ai/registerAiGatewayRoutes.ts'),
      'utf8',
    );
    const env = readFileSync(join(repoRoot, '.env.example'), 'utf8');
    assert.match(gateway, /phase:\s*(?:23|24|25|[2-9]\d+)/);
    assert.match(gateway, /offlineEvalHarness:\s*true/);
    assert.match(gateway, /goldenReviewSet:\s*true/);
    assert.match(env, /AI_EVAL_HARNESS_ENABLED=false/);
  });
});
