import {
  applyClaimedSideEffectGuard,
  detectClaimedSideEffects,
  evaluateAssistSafety,
  evaluateCartPlanRequestSafety,
} from '../../safetyGuardrails.js';
import { parseStructuredAssistOutput } from '../../structuredOutput.js';
import type { AssistantChannel, AssistantMode } from '../../types.js';
import { matchExpect } from '../matchers.js';
import type { GoldenCase, GoldenCaseResult } from '../types.js';

export function runSafetyCase(c: GoldenCase): GoldenCaseResult {
  const kind = String(c.input.kind ?? 'assist');

  if (kind === 'claimed_side_effect') {
    const reply = String(c.input.reply ?? '');
    const actual = { claimed: detectClaimedSideEffects(reply) };
    const errors = matchExpect(actual, c.expect);
    return { id: c.id, category: c.category, ok: errors.length === 0, errors };
  }

  if (kind === 'cart_plan_request') {
    const safety = evaluateCartPlanRequestSafety({
      mode: c.input.mode,
      proposedActions: c.input.proposedActions,
    });
    const actual = {
      allowed: safety.allowed,
      violationCodes: safety.violations.map((v) => v.code),
      planCount: safety.sanitizedPlans.length,
    };
    const errors = matchExpect(actual, c.expect);
    return { id: c.id, category: c.category, ok: errors.length === 0, errors };
  }

  const mode = (c.input.mode as AssistantMode) || 'consumer_ordering';
  const channel = (c.input.channel as AssistantChannel) || 'orderbhojan_web';
  const message = String(c.input.message ?? 'help');
  const modelText = String(c.input.modelText ?? '{}');
  const parsed = parseStructuredAssistOutput({ mode, channel, message, modelText });
  let safety = evaluateAssistSafety(parsed.value, {
    allowMutationPlans: c.input.allowMutationPlans === true,
    readOnlyConsumer: c.input.readOnlyConsumer !== false && mode === 'consumer_ordering',
  });
  if (c.input.applyClaimedGuard === true) {
    safety = applyClaimedSideEffectGuard(safety);
  }

  const actual = {
    allowed: safety.allowed,
    safetyBlocked: safety.sanitized.safety.blocked,
    violationCodes: safety.violations.map((v) => v.code),
    proposedActionTypes: safety.sanitized.proposedActions.map((a) => a.type),
  };
  const errors = matchExpect(actual, c.expect);
  return { id: c.id, category: c.category, ok: errors.length === 0, errors };
}
