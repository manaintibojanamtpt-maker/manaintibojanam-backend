import {
  parseCartPlanRequest,
  type ParseCartPlanRequestFailure,
} from '../../cartActionPlan.js';
import { matchExpect } from '../matchers.js';
import type { GoldenCase, GoldenCaseResult } from '../types.js';

export function runCartPlanParseCase(c: GoldenCase): GoldenCaseResult {
  const result = parseCartPlanRequest({
    mode: c.input.mode,
    channel: c.input.channel,
    restaurantId: c.input.restaurantId,
    proposedActions: c.input.proposedActions,
    orderType: c.input.orderType,
    conversationId: c.input.conversationId,
  });

  let actual: {
    ok: boolean;
    planCount: number;
    issueCodes: string[];
    clarificationQuestions: string[];
    hasClarification: boolean;
  };
  if (result.ok) {
    actual = {
      ok: true,
      planCount: result.plans.length,
      issueCodes: result.issues.map((i) => i.code),
      clarificationQuestions: [],
      hasClarification: false,
    };
  } else {
    const failure = result as ParseCartPlanRequestFailure;
    actual = {
      ok: false,
      planCount: 0,
      issueCodes: failure.issues.map((i) => i.code),
      clarificationQuestions: [...failure.clarificationQuestions],
      hasClarification: failure.clarificationQuestions.length > 0,
    };
  }

  const errors = matchExpect(actual, c.expect);
  return { id: c.id, category: c.category, ok: errors.length === 0, errors };
}
