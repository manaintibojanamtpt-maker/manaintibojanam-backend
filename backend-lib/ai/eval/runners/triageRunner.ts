import { classifyIntentHeuristic } from '../../intentTaxonomy.js';
import { detectClaimedSideEffects } from '../../safetyGuardrails.js';
import { buildPostOrderTriageGuidance } from '../../../../orderbhojan/src/features/assistant/domain/buildPostOrderTriageGuidance.js';
import {
  classifyPostOrderHighRiskMessage,
  isPostOrderHighRiskMessage,
} from '../../../../orderbhojan/src/features/assistant/domain/postOrderHighRiskIntents.js';
import { matchExpect } from '../matchers.js';
import type { GoldenCase, GoldenCaseResult } from '../types.js';

export function runTriageCase(c: GoldenCase): GoldenCaseResult {
  const message = String(c.input.message ?? '');
  const kind = String(c.input.kind ?? 'classify');

  if (kind === 'claimed_outcome') {
    const reply = String(c.input.reply ?? '');
    const actual = { claimed: detectClaimedSideEffects(reply) };
    const errors = matchExpect(actual, c.expect);
    return { id: c.id, category: c.category, ok: errors.length === 0, errors };
  }

  const highRisk = isPostOrderHighRiskMessage(message);
  const riskKind = classifyPostOrderHighRiskMessage(message);
  const gatewayIntent = classifyIntentHeuristic('consumer_ordering', message);
  const guidance = buildPostOrderTriageGuidance({
    message,
    orderContext: c.input.orderContext as
      | { orderId?: string; snapshot?: { orderNumber?: string; status?: string; paymentStatus?: string } }
      | undefined,
  });

  const actual = {
    highRisk,
    riskKind: riskKind ?? null,
    gatewayIntent,
    hasGuidance: guidance !== null,
    clarificationCount: guidance?.clarificationQuestions.length ?? 0,
    escalationTargets: guidance?.escalationHints.map((h) => h.target) ?? [],
    systemNote: guidance?.systemNote ?? null,
  };
  const errors = matchExpect(actual, c.expect);
  return { id: c.id, category: c.category, ok: errors.length === 0, errors };
}
