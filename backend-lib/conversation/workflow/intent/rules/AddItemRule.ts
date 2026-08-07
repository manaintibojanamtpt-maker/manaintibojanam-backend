import type { IntentRule, IntentResolutionContext } from '../IntentRule.js';
import type { IntentResolutionResult } from '../IntentResolutionResult.js';
import { ConversationIntent } from '../../../models/ConversationIntent.js';

/**
 * Purpose: Detects intents to add items to the order.
 * 
 * Priority: 50 (Medium). This is the core transactional intent, but it must 
 * yield to explicit control flows (Cancel, Confirmation, Checkout).
 */
export class AddItemRule implements IntentRule {
  public readonly name = 'AddItemRule';
  public readonly priority = 50;

  // Common verbs associated with adding items
  private readonly addVerbs = new Set([
    'add',
    'want',
    'give',
    'get',
    'need',
    'kavali',
    'chahiye',
    'cheyyandi',
    'cheyandi',
    'petandi',
    'order',
  ]);

  public matches(normalizedTranscript: string): boolean {
    // We want this rule to evaluate almost any transcript because users often
    // just say the food name (e.g. "chicken biryani") without verbs.
    // It will return true universally, and rely on `resolve()` to score it accurately.
    return true;
  }

  public resolve(
    normalizedTranscript: string,
    context?: IntentResolutionContext
  ): IntentResolutionResult {
    const tokens = normalizedTranscript.split(/\s+/);
    
    // The IntentResolver pre-injects extracted entities into the context.
    const preExtractedEntities = (context as any)?.entities || [];
    
    const foodItems = preExtractedEntities.filter((e: any) => e.type === 'FoodItem');
    const quantities = preExtractedEntities.filter((e: any) => e.type === 'Quantity');

    let hasVerb = false;
    for (const token of tokens) {
      if (this.addVerbs.has(token)) {
        hasVerb = true;
        break;
      }
    }

    // Confidence Calculation:
    // If we have a FoodItem and a Quantity -> 1.0
    // If we have a FoodItem -> 0.8
    // If we only have an "add" verb -> 0.4 (Requires clarification)
    // If we only have a Quantity -> 0.3 (Requires clarification)
    // Otherwise -> 0.0
    
    let ruleScore = 0.0;
    let requiresClarification = false;
    let clarificationReason: string | undefined;

    if (foodItems.length > 0 && quantities.length > 0) {
      ruleScore = 1.0;
    } else if (foodItems.length > 0) {
      // Missing quantity, but it's safe to assume quantity=1 downstream
      ruleScore = 0.8; 
    } else if (hasVerb) {
      ruleScore = 0.4;
      requiresClarification = true;
      clarificationReason = 'MissingFoodItem';
    } else if (quantities.length > 0) {
      ruleScore = 0.3;
      requiresClarification = true;
      clarificationReason = 'MissingFoodItem';
    }

    const lexicalScore = hasVerb ? 0.2 : 0.0;
    const entityScore = (foodItems.length > 0 ? 0.6 : 0.0) + (quantities.length > 0 ? 0.2 : 0.0);
    const contextScore = 0.0;
    
    // We use the deterministic ruleScore above, but cap it safely.
    const finalScore = ruleScore;

    return {
      intent: ConversationIntent.AddItem,
      confidence: finalScore,
      entities: preExtractedEntities, // Pass through the pre-extracted entities
      requiresClarification,
      clarificationReason,
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
