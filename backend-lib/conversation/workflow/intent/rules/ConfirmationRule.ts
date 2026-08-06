import type { IntentRule, IntentResolutionContext } from '../IntentRule.js';
import type { IntentResolutionResult } from '../IntentResolutionResult.js';
import { ConversationIntent } from '../../../models/ConversationIntent.js';
import type { ConfirmationEntity } from '../../../models/ConversationEntity.js';

/**
 * Purpose: Detects explicit confirmations and negations (yes/no responses).
 * 
 * Priority: 90 (High). If the user says "yes" or "no", it is typically 
 * a direct response to a system question and should take precedence over 
 * passive intents.
 */
export class ConfirmationRule implements IntentRule {
  public readonly name = 'ConfirmationRule';
  // High priority to immediately catch explicit yes/no answers.
  public readonly priority = 90;

  // TranscriptNormalizer guarantees that affirmative/negative synonyms
  // across languages are mapped to exactly "yes" or "no".
  private readonly confirmationTokens = new Set(['yes', 'no']);

  public matches(normalizedTranscript: string): boolean {
    const tokens = normalizedTranscript.split(/\s+/);
    return tokens.some(token => this.confirmationTokens.has(token));
  }

  public resolve(
    normalizedTranscript: string,
    context?: IntentResolutionContext
  ): IntentResolutionResult {
    const tokens = normalizedTranscript.split(/\s+/);
    
    let hasYes = false;
    let hasNo = false;

    for (const token of tokens) {
      if (token === 'yes') hasYes = true;
      if (token === 'no') hasNo = true;
    }

    // Confidence Calculation:
    // If the transcript only contains yes/no (or minimal noise), confidence is high.
    // If it contains both (e.g. "no wait yes"), it requires clarification.
    // If it contains yes/no + many other words, confidence drops.
    
    let ruleScore = 0.0;
    let requiresClarification = false;
    const entities: ConfirmationEntity[] = [];

    if (hasYes && hasNo) {
      // Contradictory input -> low confidence, force clarification
      ruleScore = 0.3;
      requiresClarification = true;
    } else if (hasYes || hasNo) {
      if (tokens.length <= 2) {
        ruleScore = 1.0; // "yes", "no", "yes please"
      } else {
        ruleScore = 0.6; // Mixed input like "yes i want that"
      }

      const token = hasYes ? 'yes' : 'no';
      const startIndex = normalizedTranscript.indexOf(token);
      entities.push({
        type: 'Confirmation',
        rawValue: token,
        normalizedValue: token,
        booleanValue: hasYes,
        startIndex,
        endIndex: startIndex >= 0 ? startIndex + token.length : undefined,
      });
    }

    const lexicalScore = ruleScore;
    const entityScore = entities.length > 0 ? 1.0 : 0.0;
    const contextScore = 0.0;
    const finalScore = ruleScore; // Keep simple for now

    return {
      intent: ConversationIntent.Confirmation,
      confidence: finalScore,
      entities,
      requiresClarification,
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
