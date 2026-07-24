import { parseStructuredAssistOutput } from '../../structuredOutput.js';
import type { AssistantChannel, AssistantMode } from '../../types.js';
import { matchExpect } from '../matchers.js';
import type { GoldenCase, GoldenCaseResult } from '../types.js';

export function runStructuredOutputCase(c: GoldenCase): GoldenCaseResult {
  const mode = (c.input.mode as AssistantMode) || 'consumer_ordering';
  const channel = (c.input.channel as AssistantChannel) || 'orderbhojan_web';
  const message = String(c.input.message ?? '');
  const modelText = String(c.input.modelText ?? '');
  const parsed = parseStructuredAssistOutput({ mode, channel, message, modelText });
  const actual = {
    ok: parsed.ok,
    source: parsed.source,
    intent: parsed.value.intent,
    reply: parsed.value.reply,
    proposedActionTypes: parsed.value.proposedActions.map((a) => a.type),
    executableFlags: parsed.value.proposedActions.map((a) => Boolean(a.executable)),
  };
  const errors = matchExpect(actual, c.expect);
  return { id: c.id, category: c.category, ok: errors.length === 0, errors };
}
