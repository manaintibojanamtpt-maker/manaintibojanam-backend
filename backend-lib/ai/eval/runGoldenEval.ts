import { AI_EVAL_FIXTURE_SET_VERSION, AI_EVAL_SCHEMA_VERSION } from '../aiEvalConfig.js';
import { loadGoldenCases } from './loadFixtures.js';
import { runGoldenCase } from './runners/registry.js';
import type { GoldenCase, GoldenEvalReport } from './types.js';

/** Run an ad-hoc set of golden cases (e.g. shadow-synthesized) without loading fixtures. */
export function runGoldenCases(cases: readonly GoldenCase[]): GoldenEvalReport {
  const results = cases.map((c) => runGoldenCase(c));
  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;

  return {
    schemaVersion: AI_EVAL_SCHEMA_VERSION,
    fixtureSetVersion: AI_EVAL_FIXTURE_SET_VERSION,
    mutatedState: false,
    total: results.length,
    passed,
    failed,
    results,
  };
}

export function runGoldenEval(options?: {
  readonly fixtureSetVersion?: string;
  readonly categories?: readonly string[];
}): GoldenEvalReport {
  const fixtureSetVersion = options?.fixtureSetVersion ?? AI_EVAL_FIXTURE_SET_VERSION;
  let cases = loadGoldenCases(fixtureSetVersion);
  if (options?.categories?.length) {
    const allow = new Set(options.categories);
    cases = cases.filter((c) => allow.has(c.category));
  }

  return runGoldenCases(cases);
}

/** CLI entry: `npx tsx backend-lib/ai/eval/runGoldenEval.ts` */
const isMain =
  process.argv[1] &&
  (process.argv[1].endsWith('runGoldenEval.ts') || process.argv[1].endsWith('runGoldenEval.js'));

if (isMain) {
  const report = runGoldenEval();
  for (const result of report.results) {
    const mark = result.ok ? 'PASS' : 'FAIL';
    console.log(`${mark} ${result.category}/${result.id}`);
    if (!result.ok) {
      for (const err of result.errors) console.log(`  - ${err}`);
    }
  }
  console.log(
    `\nGolden eval ${report.passed}/${report.total} passed (fixtureSet v${report.fixtureSetVersion})`,
  );
  if (report.failed > 0) process.exitCode = 1;
}
