import { buildCartAddPlansFromReorder } from '../../../../orderbhojan/src/features/assistant/domain/buildPersonalizationCartPlans.js';
import { buildPersonalizationGuidance } from '../../../../orderbhojan/src/features/assistant/domain/buildPersonalizationGuidance.js';
import {
  classifyPersonalizationIntent,
  isPersonalizationUserMessage,
} from '../../../../orderbhojan/src/features/assistant/domain/isPersonalizationUserMessage.js';
import type { PersonalizationBootstrap } from '../../../../orderbhojan/src/features/assistant/domain/personalizationBootstrap.types.js';
import type { PersonalizationReorderSource } from '../../../../orderbhojan/src/features/assistant/domain/personalizationBootstrap.types.js';
import { matchExpect } from '../matchers.js';
import type { GoldenCase, GoldenCaseResult } from '../types.js';

export function runPersonalizationCase(c: GoldenCase): GoldenCaseResult {
  const kind = String(c.input.kind ?? 'classify');
  const message = String(c.input.message ?? '');

  if (kind === 'reorder_plans') {
    const source = c.input.source as PersonalizationReorderSource;
    const plans = buildCartAddPlansFromReorder(source);
    const actual = {
      planCount: plans.length,
      allNonExecutable: plans.every((p) => p.executable === false),
      allRequireConfirmation: plans.every((p) => p.requiresConfirmation === true),
      foodIds: plans.map((p) => p.payload?.foodId ?? p.payload?.itemId),
    };
    const errors = matchExpect(actual, c.expect);
    return { id: c.id, category: c.category, ok: errors.length === 0, errors };
  }

  if (kind === 'guidance') {
    const intent = classifyPersonalizationIntent(message);
    const guidance = buildPersonalizationGuidance({
      intent,
      bootstrap: c.input.bootstrap as PersonalizationBootstrap | undefined,
    });
    const actual = {
      intent,
      hasGuidance: guidance !== null,
      reply: guidance?.reply ?? null,
      hintTargets: guidance?.hints.map((h) => h.target) ?? [],
      inventsDishes: /\b(idli|dosa|biryani|paneer)\b/i.test(guidance?.reply ?? '') && intent === 'favorite_restaurants',
    };
    const errors = matchExpect(actual, c.expect);
    return { id: c.id, category: c.category, ok: errors.length === 0, errors };
  }

  const intent = classifyPersonalizationIntent(message);
  const actual = {
    intent,
    isPersonalization: isPersonalizationUserMessage(message),
  };
  const errors = matchExpect(actual, c.expect);
  return { id: c.id, category: c.category, ok: errors.length === 0, errors };
}
