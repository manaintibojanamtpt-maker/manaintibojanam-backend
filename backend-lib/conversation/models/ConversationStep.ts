/**
 * Purpose: Represents a single turn/step in a conversation history.
 * Public API: ConversationStep interface
 * Dependencies: None
 * Consumers: ConversationSnapshot
 * Future phases: Integration with vector stores for semantic retrieval of history.
 */

export interface ConversationStep {
  readonly id: string;
  readonly role: 'user' | 'assistant' | 'system';
  readonly message: string;
  readonly timestamp: number;
  readonly metadata?: Record<string, unknown>;
}
