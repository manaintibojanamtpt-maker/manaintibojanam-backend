/**
 * Purpose: A point-in-time representation of the conversation state and recent history.
 * Public API: ConversationSnapshot interface
 * Dependencies: ConversationState, ConversationStep
 * Consumers: ConversationEngine, SessionManager
 * Future phases: Rollback, replay capabilities, and audit logs.
 */

import type { ConversationState } from './ConversationState.js';
import type { ConversationStep } from './ConversationStep.js';

export interface ConversationSnapshot {
  readonly state: ConversationState;
  readonly recentSteps: readonly ConversationStep[];
  readonly snapshotId: string;
  readonly timestamp: number;
}
