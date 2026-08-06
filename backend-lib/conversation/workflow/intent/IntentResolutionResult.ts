import type { ConversationIntent } from '../../models/ConversationIntent.js';
import type { ConversationEntity } from '../../models/ConversationEntity.js';

export interface IntentResolutionResult {
  /**
   * The identified intent for the given transcript.
   */
  readonly intent: ConversationIntent;

  /**
   * Confidence score from 0.0 to 1.0.
   */
  readonly confidence: number;

  /**
   * Any entities extracted during intent resolution.
   */
  readonly entities: ConversationEntity[];

  /**
   * True if the intent matches but requires explicit clarification from the user
   * (e.g., missing mandatory parameters for a high-priority action).
   */
  readonly requiresClarification: boolean;

  /**
   * Internal string explaining why clarification is required.
   */
  readonly clarificationReason?: string;

  /**
   * The text that was used for the resolution after cleaning/normalizing.
   */
  readonly normalizedTranscript: string;

  /**
   * Internal breakdown of how the final confidence score was calculated.
   * Not intended for public API consumption.
   */
  readonly _confidenceBreakdown?: {
    lexicalScore: number;
    ruleScore: number;
    entityScore: number;
    contextScore: number;
    finalScore: number;
  };
}
