/**
 * Purpose: Orchestrates transcript processing, state transitions, and event publishing.
 * Public API: ConversationEngine class
 * Dependencies: SessionManager, ConversationEvents, ConversationState, VoiceContext, ConversationResult
 * Consumers: API Gateway (Passive invocation)
 * Future phases: Will orchestrate LLM providers and complex state workflow logic.
 */

import type { ISessionManager } from '../session/SessionManager.js';
import type { VoiceContext } from '../models/VoiceContext.js';
import type { ConversationResult } from '../models/ConversationResult.js';
import type { ConversationEvent } from '../events/ConversationEvents.js';
import { ConversationStatus } from '../models/ConversationState.js';

export interface IConversationEngine {
  receiveTranscript(sessionId: string, transcript: string, context: VoiceContext): Promise<ConversationResult>;
  publishEvent(event: ConversationEvent): void;
}

/**
 * Phase 1 Implementation of Conversation Engine.
 * Acts completely passively. Stores transcripts in history and returns state.
 * Does not make LLM calls.
 */
export class ConversationEngine implements IConversationEngine {
  constructor(private readonly sessionManager: ISessionManager) {}

  public async receiveTranscript(
    sessionId: string, 
    transcript: string, 
    context: VoiceContext
  ): Promise<ConversationResult> {
    const session = await this.sessionManager.loadSession(sessionId);
    
    if (!session) {
      return {
        snapshot: null as any, // Not found
        success: false,
        error: `Session ${sessionId} not found`,
      };
    }

    const now = Date.now();
    
    // 1. Publish TranscriptReceived event
    this.publishEvent({
      type: 'TranscriptReceived',
      sessionId,
      timestamp: now,
      transcript,
    });

    // 2. Append step to snapshot history (Phase 1 passive tracking)
    const newStep = {
      id: `step_${now}`,
      role: 'user' as const,
      message: transcript,
      timestamp: now,
    };

    const newSnapshot = {
      ...session.snapshot,
      snapshotId: `snap_${now}`,
      timestamp: now,
      recentSteps: [...session.snapshot.recentSteps, newStep],
      state: {
        ...session.snapshot.state,
        status: ConversationStatus.Thinking, // Just an example state transition
        updatedTime: now,
      }
    };

    // 3. Update Session
    await this.sessionManager.updateSession(sessionId, newSnapshot);

    // 4. Return result
    return {
      snapshot: newSnapshot,
      success: true,
      systemReply: undefined, // No LLM integration yet
    };
  }

  public publishEvent(event: ConversationEvent): void {
    // Phase 1: No-op or simple logging.
    // In future phases, this will bridge to an EventBus (e.g. Google Cloud Pub/Sub, Redis PubSub, or Node EventEmitter)
    if (process.env.DEBUG_CONVERSATION_EVENTS === 'true') {
      console.log(`[ConversationEngine Event] ${event.type} for session ${event.sessionId}`, event);
    }
  }
}
