import type { IntentRule, IntentResolutionContext } from '../IntentRule.js';
import type { IntentResolutionResult } from '../IntentResolutionResult.js';
import { ConversationIntent } from '../../../models/ConversationIntent.js';
import type { OrderTypeEntity } from '../../../models/ConversationEntity.js';

/**
 * Purpose: Detects intents related to finalizing the order (checkout, bill, pay, takeaway/parcel).
 * 
 * Priority: 70 (High). Checkout commands are primary actions that finalize
 * the cart state, so they preempt AddItem/ModifyItem but yield to Confirmation/Cancel.
 */
export class CheckoutRule implements IntentRule {
  public readonly name = 'CheckoutRule';
  public readonly priority = 70;

  // TranscriptNormalizer maps variations of checkout (bill, pay, payment) to 'checkout'
  // and variations of takeaway (parcel, to go) to 'takeaway'.
  private readonly checkoutTokens = new Set(['checkout', 'takeaway']);

  public matches(normalizedTranscript: string): boolean {
    const tokens = normalizedTranscript.split(/\s+/);
    return tokens.some(token => this.checkoutTokens.has(token));
  }

  public resolve(
    normalizedTranscript: string,
    context?: IntentResolutionContext
  ): IntentResolutionResult {
    const tokens = normalizedTranscript.split(/\s+/);
    
    let isTakeaway = false;
    let isCheckout = false;

    for (const token of tokens) {
      if (token === 'takeaway') isTakeaway = true;
      if (token === 'checkout') isCheckout = true;
    }

    const entities: OrderTypeEntity[] = [];
    if (isTakeaway) {
      entities.push({
        type: 'OrderType',
        rawValue: 'takeaway',
        normalizedValue: 'takeaway',
      });
    }

    // Confidence Calculation:
    // Pure "checkout" or "takeaway" -> 1.0
    // "checkout please", "make it a takeaway" -> 0.8
    // Longer mixed sentences -> 0.6
    
    let ruleScore = 0.0;
    
    if (isTakeaway || isCheckout) {
      if (tokens.length <= 2) {
        ruleScore = 1.0;
      } else if (tokens.length <= 5) {
        ruleScore = 0.8;
      } else {
        ruleScore = 0.6;
      }
    }

    const lexicalScore = ruleScore;
    const entityScore = entities.length > 0 ? 0.5 : 0.0; // Bonus for extracting OrderType
    const contextScore = 0.0;
    
    // We boost final score slightly if an entity (like Takeaway) was clearly extracted.
    const finalScore = Number(Math.min(1.0, ruleScore + (entityScore * 0.1)).toFixed(2));

    return {
      intent: ConversationIntent.Checkout,
      confidence: finalScore,
      entities,
      requiresClarification: false, // IntentResolver handles enforcing threshold < 0.5
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
