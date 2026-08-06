/**
 * Purpose: Defines domain events emitted by the Conversation Engine.
 * Public API: ConversationEvent types
 * Dependencies: ConversationIntent, ConversationEntity, ConversationStatus
 * Consumers: ConversationEngine, external Event Bus (Future)
 * Future phases: Will integrate with a distributed event bus for analytics and workflow triggers.
 */

import type { ConversationIntent } from '../models/ConversationIntent.js';
import type { ConversationEntity } from '../models/ConversationEntity.js';
import type { ConversationStatus } from '../models/ConversationState.js';

export type EventType = 
  | 'SessionStarted'
  | 'TranscriptReceived'
  | 'IntentDetected'
  | 'EntityUpdated'
  | 'QuestionAsked'
  | 'ConfirmationRequested'
  | 'ConversationCompleted'
  | 'ConversationCancelled'
  | 'ConversationFailed';

export interface BaseEvent {
  readonly type: EventType;
  readonly sessionId: string;
  readonly timestamp: number;
}

export interface SessionStartedEvent extends BaseEvent {
  readonly type: 'SessionStarted';
  readonly tenantId: string;
}

export interface TranscriptReceivedEvent extends BaseEvent {
  readonly type: 'TranscriptReceived';
  readonly transcript: string;
}

export interface IntentDetectedEvent extends BaseEvent {
  readonly type: 'IntentDetected';
  readonly intent: ConversationIntent;
}

export interface EntityUpdatedEvent extends BaseEvent {
  readonly type: 'EntityUpdated';
  readonly entities: readonly ConversationEntity[];
}

export interface QuestionAskedEvent extends BaseEvent {
  readonly type: 'QuestionAsked';
  readonly question: string;
}

export interface ConfirmationRequestedEvent extends BaseEvent {
  readonly type: 'ConfirmationRequested';
}

export interface ConversationStatusEvent extends BaseEvent {
  readonly type: 'ConversationCompleted' | 'ConversationCancelled' | 'ConversationFailed';
  readonly status: ConversationStatus;
  readonly reason?: string;
}

export type ConversationEvent = 
  | SessionStartedEvent
  | TranscriptReceivedEvent
  | IntentDetectedEvent
  | EntityUpdatedEvent
  | QuestionAskedEvent
  | ConfirmationRequestedEvent
  | ConversationStatusEvent;
