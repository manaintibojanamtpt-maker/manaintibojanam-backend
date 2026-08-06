import type { IntentRule, IntentResolutionContext } from '../IntentRule.js';
import type { IntentResolutionResult } from '../IntentResolutionResult.js';
import { ConversationIntent } from '../../../models/ConversationIntent.js';

/**
 * Purpose: Acts as the safety net for the IntentResolver. If no other rule
 * yields a confident match, this rule guarantees a deterministic fallback.
 * 
 * Priority: 0 (Lowest). It will always be evaluated last.
 */
export class FallbackRule implements IntentRule {
  public readonly name = 'FallbackRule';
  public readonly priority = 0;

  public matches(normalizedTranscript: string): boolean {
    // Universally matches everything. It is the absolute floor of the registry.
    return true;
  }

  public resolve(
    normalizedTranscript: string,
    context?: IntentResolutionContext
  ): IntentResolutionResult {
    
    // The FallbackRule always returns an Unknown intent with zero confidence,
    // guaranteeing that the workflow engine prompts for clarification.
    return {
      intent: ConversationIntent.Unknown,
      confidence: 0.0,
      entities: [],
      requiresClarification: true,
      clarificationReason: 'UnrecognizedIntent',
      normalizedTranscript,
      _confidenceBreakdown: {
        lexicalScore: 0.0,
        ruleScore: 0.0,
        entityScore: 0.0,
        contextScore: 0.0,
        finalScore: 0.0
      }
    };
  }
}
