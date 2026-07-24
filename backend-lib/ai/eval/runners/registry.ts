import { runCartPlanParseCase } from './cartPlanParseRunner.js';
import { runIntentCase } from './intentRunner.js';
import { runPersonalizationCase } from './personalizationRunner.js';
import { runSafetyCase } from './safetyRunner.js';
import { runStructuredOutputCase } from './structuredOutputRunner.js';
import { runTriageCase } from './triageRunner.js';
import type { GoldenCase, GoldenCaseResult, GoldenCategory } from '../types.js';

type Runner = (c: GoldenCase) => GoldenCaseResult;

const RUNNERS: Record<GoldenCategory, Runner> = {
  intent: runIntentCase,
  'structured-output': runStructuredOutputCase,
  safety: runSafetyCase,
  'cart-plan-parse': runCartPlanParseCase,
  clarification: runCartPlanParseCase,
  triage: runTriageCase,
  personalization: runPersonalizationCase,
};

export function runGoldenCase(c: GoldenCase): GoldenCaseResult {
  const runner = RUNNERS[c.category];
  if (!runner) {
    return {
      id: c.id,
      category: c.category,
      ok: false,
      errors: [`No runner registered for category ${c.category}`],
    };
  }
  return runner(c);
}
