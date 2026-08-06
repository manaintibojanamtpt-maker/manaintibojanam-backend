/**
 * Purpose: Defines the core state machine enumerations and full state shape for a conversation session.
 * Public API: ConversationStatus enum, ConversationState interface
 * Dependencies: ConversationIntent, ConversationEntity
 * Consumers: SessionManager, ConversationEngine
 * Future phases: Will expand to support explicit FSM guards and complex multi-turn workflows.
 */

import type { ConversationIntent } from './ConversationIntent.js';
import type { ConversationEntity } from './ConversationEntity.js';

export enum ConversationStatus {
  Idle = 'IDLE',
  Listening = 'LISTENING',
  Thinking = 'THINKING',
  Speaking = 'SPEAKING',
  WaitingForConfirmation = 'WAITING_FOR_CONFIRMATION',
  WaitingForClarification = 'WAITING_FOR_CLARIFICATION',
  Completed = 'COMPLETED',
  Cancelled = 'CANCELLED',
  TimedOut = 'TIMED_OUT',
  Failed = 'FAILED',
}

export interface ConversationState {
  readonly sessionId: string;
  readonly conversationId: string;
  readonly tenantId: string;
  readonly restaurantId?: string;
  readonly customerId?: string;
  readonly currentLanguage: string;
  readonly currentIntent: ConversationIntent | null;
  readonly detectedEntities: readonly ConversationEntity[];
  readonly currentWorkflowStep: string | null;
  readonly pendingQuestion: string | null;
  readonly pendingConfirmation: boolean;
  readonly currentCartReference: string | null;
  readonly status: ConversationStatus;
  readonly createdTime: number;
  readonly updatedTime: number;
  readonly metadata: Record<string, unknown>;
  readonly historyReference: string | null;
}
