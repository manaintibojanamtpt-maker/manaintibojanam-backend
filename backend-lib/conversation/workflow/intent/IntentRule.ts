import type { ConversationState } from '../../models/ConversationState.js';
import type { IntentResolutionResult } from './IntentResolutionResult.js';

export interface IntentResolutionContext {
  /**
   * The current conversation state, which may influence intent resolution
   * (e.g., repeating a previous order, answering a specific question).
   */
  readonly state: ConversationState;
}

export interface IntentRule {
  readonly name: string;
  readonly priority: number;

  matches(transcript: string): boolean;

  resolve(
    transcript: string,
    context?: IntentResolutionContext
  ): IntentResolutionResult;
}
