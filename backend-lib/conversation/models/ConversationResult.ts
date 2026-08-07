/**
 * Purpose: Standardized output returned by the engine after processing a turn.
 * Public API: ConversationResult interface
 * Dependencies: ConversationSnapshot, ConversationIntent
 * Consumers: ConversationEngine, API Gateway
 */

import type { ConversationSnapshot } from './ConversationSnapshot.js';
import type { ConversationIntent } from './ConversationIntent.js';

export interface ConversationResult {
  readonly snapshot: ConversationSnapshot | null;
  readonly success: boolean;
  readonly proposedActions?: readonly Record<string, unknown>[];
  readonly systemReply?: string;
  readonly error?: string;
  /** When true, gateway should continue to OpenRouter for this turn. */
  readonly fallthroughToLlm?: boolean;
  readonly workflowDecision?: 'proceed' | 'clarify' | 'deny';
  readonly workflowIntent?: ConversationIntent | null;
  readonly confidence?: number;
}
