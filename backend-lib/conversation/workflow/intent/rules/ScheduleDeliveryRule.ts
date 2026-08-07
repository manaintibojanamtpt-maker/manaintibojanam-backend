/**
 * Purpose: Detect schedule-delivery intents (ASAP / clock / meal band / multi-day / clarify).
 * Priority: 65 — below Checkout (70), above AddItem (50).
 */

import type { IntentRule, IntentResolutionContext } from '../IntentRule.js';
import type { IntentResolutionResult } from '../IntentResolutionResult.js';
import { ConversationIntent } from '../../../models/ConversationIntent.js';
import type { DeliveryTimeEntity } from '../../../models/ConversationEntity.js';

const SCHEDULE_HINT_RE =
  /\b(asap|deliver\s+now|delivery\s+now|right\s+now|schedule|scheduled|later|sometime|some\s+time|lunch|dinner|tonight|evening|morning|afternoon|tomorrow|day\s+after|\d{1,2}\s*(am|pm)?|o'?clock)\b/i;

export class ScheduleDeliveryRule implements IntentRule {
  public readonly name = 'ScheduleDeliveryRule';
  public readonly priority = 65;

  public matches(normalizedTranscript: string): boolean {
    return SCHEDULE_HINT_RE.test(normalizedTranscript);
  }

  public resolve(
    normalizedTranscript: string,
    context?: IntentResolutionContext,
  ): IntentResolutionResult {
    const fromContext = (context?.entities ?? []).filter(
      (e): e is DeliveryTimeEntity => e.type === 'DeliveryTime',
    );
    const delivery = fromContext[0];

    if (delivery && !delivery.ambiguous && delivery.mode === 'asap') {
      return {
        intent: ConversationIntent.ScheduleDelivery,
        confidence: 0.95,
        entities: [delivery],
        requiresClarification: false,
        normalizedTranscript,
        _confidenceBreakdown: {
          lexicalScore: 0.9,
          ruleScore: 0.95,
          entityScore: 1,
          contextScore: 0,
          finalScore: 0.95,
        },
      };
    }

    // Only proceed when we have a concrete Today/Tomorrow slot hint.
    if (
      delivery &&
      !delivery.ambiguous &&
      delivery.mode === 'scheduled' &&
      delivery.deliveryTimeSlot &&
      delivery.normalizedValue !== 'out_of_horizon'
    ) {
      return {
        intent: ConversationIntent.ScheduleDelivery,
        confidence: Math.max(0.8, delivery.confidence ?? 0.8),
        entities: [delivery],
        requiresClarification: false,
        normalizedTranscript,
        _confidenceBreakdown: {
          lexicalScore: 0.85,
          ruleScore: 0.9,
          entityScore: 1,
          contextScore: 0,
          finalScore: Math.max(0.8, delivery.confidence ?? 0.8),
        },
      };
    }

    // Out of horizon / ambiguous / bare schedule hint → clarify.
    if (
      delivery?.normalizedValue === 'out_of_horizon' ||
      delivery?.ambiguous ||
      SCHEDULE_HINT_RE.test(normalizedTranscript)
    ) {
      const clarificationReason =
        delivery?.normalizedValue === 'out_of_horizon' && !delivery.ambiguous
          ? 'OutOfHorizonDeliveryTime'
          : delivery?.ambiguous
            ? 'AmbiguousDeliveryTime'
            : 'MissingDeliveryTime';
      return {
        intent: ConversationIntent.ScheduleDelivery,
        confidence: 0.45,
        entities: delivery ? [delivery] : [],
        requiresClarification: true,
        clarificationReason,
        normalizedTranscript,
        _confidenceBreakdown: {
          lexicalScore: 0.5,
          ruleScore: 0.45,
          entityScore: delivery ? 0.3 : 0,
          contextScore: 0,
          finalScore: 0.45,
        },
      };
    }

    return {
      intent: ConversationIntent.ScheduleDelivery,
      confidence: 0,
      entities: [],
      requiresClarification: false,
      normalizedTranscript,
      _confidenceBreakdown: {
        lexicalScore: 0,
        ruleScore: 0,
        entityScore: 0,
        contextScore: 0,
        finalScore: 0,
      },
    };
  }
}
