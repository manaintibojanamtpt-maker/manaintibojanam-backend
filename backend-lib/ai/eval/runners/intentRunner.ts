import { classifyIntentHeuristic, isIntentAllowedForMode } from '../../intentTaxonomy.js';
import type { AssistantMode } from '../../types.js';
import { matchExpect } from '../matchers.js';
import type { GoldenCase, GoldenCaseResult } from '../types.js';

export function runIntentCase(c: GoldenCase): GoldenCaseResult {
  const mode = (c.input.mode as AssistantMode) || 'consumer_ordering';
  const message = String(c.input.message ?? '');
  const intent = classifyIntentHeuristic(mode, message);
  const actual = {
    intent,
    allowedForMode: isIntentAllowedForMode(mode, intent),
  };
  return {
    id: c.id,
    category: c.category,
    ok: matchExpect(actual, c.expect).length === 0,
    errors: matchExpect(actual, c.expect),
  };
}
