/**
 * Purpose: A pure, deterministic classifier that determines the user's intent 
 * from a pre-normalized transcript and extracted entities.
 * 
 * Public API: IntentResolver class
 * Dependencies: IntentRuleRegistry, IntentRule, IntentResolutionResult, ConversationModels
 * Consumers: WorkflowEngine
 */

import type { IntentRuleRegistry } from './IntentRuleRegistry.js';
import type { IntentResolutionResult } from './IntentResolutionResult.js';
import type { IntentResolutionContext } from './IntentRule.js';
import type { ConversationEntity } from '../../models/ConversationEntity.js';
import { ConversationIntent } from '../../models/ConversationIntent.js';

export class IntentResolver {
  constructor(private readonly registry: IntentRuleRegistry) {}

  /**
   * Resolves the intent based on a pre-normalized transcript and pre-extracted entities.
   * 
   * @param normalizedTranscript The transcript that has already been normalized.
   * @param context The current conversation state context.
   * @param entities The entities that have already been extracted.
   * @returns An IntentResolutionResult detailing the matched intent.
   */
  public resolve(
    normalizedTranscript: string,
    context?: IntentResolutionContext,
    entities: readonly ConversationEntity[] = []
  ): IntentResolutionResult {
    
    // Create an extended context that includes the pre-extracted entities
    // so rules can factor them into their confidence scores.
    const ruleContext = {
      ...context,
      entities
    };

    let bestResult: IntentResolutionResult | null = null;
    const rules = this.registry.getRules();

    for (const rule of rules) {
      if (rule.matches(normalizedTranscript)) {
        // Safe casting the extended context because rules might want to peek at entities
        // without violating the interface strictly.
        const result = rule.resolve(normalizedTranscript, ruleContext as any);
        
        // Update bestResult if we found a higher confidence match.
        // If confidence is identically 0.0, prefer Unknown (FallbackRule) over other zeros.
        if (
          !bestResult ||
          result.confidence > bestResult.confidence ||
          (result.confidence === 0 &&
            bestResult.confidence === 0 &&
            result.intent === ConversationIntent.Unknown)
        ) {
          bestResult = result;
        }

        // If we hit a high confidence match, we can stop evaluating lower priority rules
        if (bestResult.confidence >= 0.8) {
          break;
        }
      }
    }

    if (!bestResult) {
      throw new Error("No rule resolved the transcript, and FallbackRule was either missing or failed to match.");
    }

    // Enforce clarification flag if confidence is low
    if (bestResult.confidence < 0.5 && !bestResult.requiresClarification) {
      return {
        ...bestResult,
        requiresClarification: true,
        clarificationReason: bestResult.clarificationReason || 'Confidence below threshold'
      };
    }

    return bestResult;
  }
}
