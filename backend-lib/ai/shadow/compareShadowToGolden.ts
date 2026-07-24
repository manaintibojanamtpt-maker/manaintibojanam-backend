import { runGoldenCase } from '../eval/runners/registry.js';
import type { GoldenCase, GoldenCategory } from '../eval/types.js';
import type {
  ShadowCategoryHit,
  ShadowCompareReport,
  ShadowCompareSample,
  ShadowSampleCompareResult,
} from './aiShadowCompareReport.js';
import {
  buildCartPlanSoftExpect,
  buildClarificationSoftExpect,
  buildIntentSoftExpect,
  buildPersonalizationSoftExpect,
  buildSafetySoftExpect,
  buildTriageSoftExpect,
  cartPlanParseRunnerInput,
  clarificationRunnerInput,
  intentRunnerInput,
  normalizeShadowCompareSample,
  personalizationRunnerInput,
  safetyClaimedSideEffectInput,
  triageRunnerInput,
} from './mapAuditEventToShadowInput.js';

function sampleKey(sample: ShadowCompareSample, index?: number): string {
  return (
    sample.sampleId ??
    sample.correlationId ??
    (typeof index === 'number' ? `shadow-${index}` : `shadow-${sample.message.slice(0, 24)}`)
  );
}

/** Infer which golden eval categories apply to a shadow sample. */
export function inferShadowCategories(sample: ShadowCompareSample): GoldenCategory[] {
  const categories: GoldenCategory[] = ['intent'];

  if (sample.reply?.trim()) {
    categories.push('safety');
  }

  if (triageRunnerInput(sample)) {
    categories.push('triage');
  }

  if (personalizationRunnerInput(sample)) {
    categories.push('personalization');
  }

  if (cartPlanParseRunnerInput(sample)) {
    categories.push('cart-plan-parse');
  }

  if (clarificationRunnerInput(sample)) {
    categories.push('clarification');
  }

  return categories;
}

function buildGoldenCasesForShadowSample(
  sample: ShadowCompareSample,
  sampleId: string,
): GoldenCase[] {
  const cases: GoldenCase[] = [];

  cases.push({
    id: `${sampleId}/intent`,
    category: 'intent',
    input: intentRunnerInput(sample),
    expect: buildIntentSoftExpect(sample),
  });

  const safetyInput = safetyClaimedSideEffectInput(sample);
  if (safetyInput) {
    const safetyExpect = buildSafetySoftExpect(sample.reply ?? '');
    if (safetyExpect) {
      cases.push({
        id: `${sampleId}/safety`,
        category: 'safety',
        input: safetyInput,
        expect: safetyExpect,
      });
    }
  }

  const triageInput = triageRunnerInput(sample);
  if (triageInput) {
    cases.push({
      id: `${sampleId}/triage`,
      category: 'triage',
      input: triageInput,
      expect: buildTriageSoftExpect(sample),
    });
  }

  const personalizationInput = personalizationRunnerInput(sample);
  if (personalizationInput) {
    cases.push({
      id: `${sampleId}/personalization`,
      category: 'personalization',
      input: personalizationInput,
      expect: buildPersonalizationSoftExpect(sample),
    });
  }

  const cartInput = cartPlanParseRunnerInput(sample);
  if (cartInput) {
    cases.push({
      id: `${sampleId}/cart-plan-parse`,
      category: 'cart-plan-parse',
      input: cartInput,
      expect: buildCartPlanSoftExpect(sample),
    });
  }

  const clarificationInput = clarificationRunnerInput(sample);
  if (clarificationInput) {
    cases.push({
      id: `${sampleId}/clarification`,
      category: 'clarification',
      input: clarificationInput,
      expect: buildClarificationSoftExpect(sample),
    });
  }

  return cases;
}

function toCategoryHit(result: ReturnType<typeof runGoldenCase>): ShadowCategoryHit {
  const driftReasons = result.ok
    ? []
    : result.errors.map((err) => `${result.category}: ${err}`);
  return {
    category: result.category,
    caseId: result.id,
    ok: result.ok,
    errors: result.errors,
    driftReasons,
  };
}

/** Compare one shadow sample against deterministic golden eval categories. */
export function compareShadowSample(
  sample:
    | ShadowCompareSample
    | Parameters<typeof normalizeShadowCompareSample>[0],
  index?: number,
): ShadowSampleCompareResult {
  const normalized = normalizeShadowCompareSample(sample);
  const sampleId = sampleKey(normalized, index);
  const categoriesRun = inferShadowCategories(normalized);
  const goldenCases = buildGoldenCasesForShadowSample(normalized, sampleId);
  const categoryHits = goldenCases.map((c) => toCategoryHit(runGoldenCase(c)));
  const driftReasons = categoryHits.flatMap((hit) => hit.driftReasons);

  return {
    sampleId,
    message: normalized.message,
    categoriesRun,
    categoryHits,
    drift: driftReasons.length > 0,
    driftReasons,
  };
}

/** Compare a batch of shadow samples and aggregate drift summary. */
export function compareShadowBatch(
  samples: readonly (
    | ShadowCompareSample
    | Parameters<typeof normalizeShadowCompareSample>[0]
  )[],
): ShadowCompareReport {
  const results = samples.map((sample, index) => compareShadowSample(sample, index));
  const passed = results.filter((r) => !r.drift).length;
  const failed = results.length - passed;

  return {
    schemaVersion: '24.0',
    mutatedState: false,
    total: results.length,
    passed,
    failed,
    driftCount: failed,
    results,
  };
}
