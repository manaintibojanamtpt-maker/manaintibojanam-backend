/**
 * Purpose: Standardized output returned by the engine after processing a turn.
 * Public API: ConversationResult interface
 * Dependencies: ConversationSnapshot
 * Consumers: ConversationEngine, API Gateway
 * Future phases: Will include action execution plans and LLM responses.
 */

import type { ConversationSnapshot } from './ConversationSnapshot.js';

export interface ConversationResult {
  readonly snapshot: ConversationSnapshot;
  readonly success: boolean;
  readonly proposedActions?: readonly Record<string, unknown>[];
  readonly systemReply?: string;
  readonly error?: string;
}
