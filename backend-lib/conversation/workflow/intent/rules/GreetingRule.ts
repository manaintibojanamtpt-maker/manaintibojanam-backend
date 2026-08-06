import type { IntentRule, IntentResolutionContext } from '../IntentRule.js';
import type { IntentResolutionResult } from '../IntentResolutionResult.js';
import { ConversationIntent } from '../../../models/ConversationIntent.js';

/**
 * Purpose: Detects conversational greetings (hello, hi, namaste, etc.)
 * 
 * Priority: 10 (Low). Greetings are easily overridden by substantive intents
 * like AddItem or Checkout if the user combines a greeting with a command
 * (e.g. "Hi, I want a biryani").
 */
export class GreetingRule implements IntentRule {
  public readonly name = 'GreetingRule';
  // Low priority so that if a transcript contains both a greeting and a command,
  // the command rule (e.g. AddItem with priority 100) will be evaluated first 
  // and win if it has high confidence.
  public readonly priority = 10;

  private readonly greetingTokens = new Set([
    'hi', 'hello', 'hey', 'namaste', 'hola', 'greetings', 'namaskaram'
  ]);

  public matches(normalizedTranscript: string): boolean {
    // Quick check to see if any token in the transcript is a known greeting
    const tokens = normalizedTranscript.split(/\s+/);
    return tokens.some(token => this.greetingTokens.has(token));
  }

  public resolve(
    normalizedTranscript: string,
    context?: IntentResolutionContext
  ): IntentResolutionResult {
    
    const tokens = normalizedTranscript.split(/\s+/);
    let greetingCount = 0;

    for (const token of tokens) {
      if (this.greetingTokens.has(token)) {
        greetingCount++;
      }
    }

    // Confidence Calculation:
    // If the entire transcript is just greetings, confidence is 1.0.
    // If the transcript contains greetings but also other words, confidence drops significantly.
    // This allows fallback to other rules if the user says "hi i want biryani" 
    // and AddItemRule somehow fails.
    
    let ruleScore = 0;
    if (greetingCount > 0) {
      if (greetingCount === tokens.length) {
        ruleScore = 1.0; // Pure greeting
      } else {
        ruleScore = 0.4; // Mixed phrasing (e.g. "hi there")
      }
    }

    const lexicalScore = ruleScore;
    const entityScore = 0.0; // Greetings don't use entities
    const contextScore = 0.0;
    const finalScore = ruleScore;

    return {
      intent: ConversationIntent.Greeting,
      confidence: finalScore,
      entities: [], // No entities extracted for greetings
      requiresClarification: false,
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
