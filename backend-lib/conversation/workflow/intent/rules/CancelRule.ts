import type { IntentRule, IntentResolutionContext } from '../IntentRule.js';
import type { IntentResolutionResult } from '../IntentResolutionResult.js';
import { ConversationIntent } from '../../../models/ConversationIntent.js';

/**
 * Purpose: Detects cancellation and abort intents ("cancel", "never mind", "stop", etc.)
 * 
 * Priority: 80 (High). Cancellation is an abort action and should preempt 
 * standard intent generation (like AddItem) to ensure the user can immediately
 * exit or reset their flow.
 */
export class CancelRule implements IntentRule {
  public readonly name = 'CancelRule';
  // High priority to preempt substantive actions, but lower than Confirmation
  // in case the user is explicitly confirming a cancellation prompt (e.g. "yes").
  public readonly priority = 80;

  // TranscriptNormalizer guarantees that various cancellation synonyms
  // ("cancel", "never mind", "leave it", "stop") are mapped to "cancelorder".
  private readonly cancelTokens = new Set(['cancelorder']);

  public matches(normalizedTranscript: string): boolean {
    const tokens = normalizedTranscript.split(/\s+/);
    return tokens.some(token => this.cancelTokens.has(token));
  }

  public resolve(
    normalizedTranscript: string,
    context?: IntentResolutionContext
  ): IntentResolutionResult {
    const tokens = normalizedTranscript.split(/\s+/);
    
    let hasCancelToken = false;
    for (const token of tokens) {
      if (this.cancelTokens.has(token)) {
        hasCancelToken = true;
        break;
      }
    }

    // Confidence Calculation:
    // If the transcript only contains the cancel token, confidence is 1.0.
    // If it contains the cancel token plus noise (e.g. "cancelorder my food please"),
    // confidence drops slightly but remains high (0.8) because cancel intents are strong.
    // If it's a very long sentence with a random "cancelorder" inside, it drops lower.
    
    let ruleScore = 0.0;
    
    if (hasCancelToken) {
      if (tokens.length <= 2) {
        ruleScore = 1.0; // "cancelorder", "cancelorder please"
      } else if (tokens.length <= 5) {
        ruleScore = 0.8; // "cancelorder my entire food order"
      } else {
        ruleScore = 0.5; // Highly mixed, e.g. "i wanted biryani but maybe just cancelorder the whole thing"
      }
    }

    const lexicalScore = ruleScore;
    const entityScore = 0.0; // Cancel doesn't extract specific entities currently
    const contextScore = 0.0;
    const finalScore = ruleScore;

    return {
      intent: ConversationIntent.Cancel,
      confidence: finalScore,
      entities: [],
      requiresClarification: false, // IntentResolver will enforce if finalScore < 0.5
      normalizedTranscript,
      _confidenceBreakdown: {
        lexicalScore,
        ruleScore,
        entityScore,
        contextScore,
        finalScore
      }
    };
  }
}
