/**
 * Purpose: Orchestrates transcript processing via WorkflowEngine; owns conversation turns.
 * Public API: ConversationEngine class
 * Dependencies: SessionManager, ConversationTurnOrchestrator, ConversationEvents
 * Consumers: API Gateway (active + passive invocation)
 */

import type { ISessionManager } from '../session/SessionManager.js';
import type { VoiceContext } from '../models/VoiceContext.js';
import type { ConversationResult } from '../models/ConversationResult.js';
import type { ConversationEvent } from '../events/ConversationEvents.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import {
  createDefaultTurnOrchestrator,
  type ConversationTurnOrchestrator,
} from '../workflow/ConversationTurnOrchestrator.js';

export interface IConversationEngine {
  receiveTranscript(
    sessionId: string,
    transcript: string,
    context: VoiceContext,
  ): Promise<ConversationResult>;
  publishEvent(event: ConversationEvent): void;
}

function shouldFallthroughToLlm(intent: ConversationIntent, kind: string): boolean {
  if (intent === ConversationIntent.Unknown) return true;
  if (intent === ConversationIntent.Help) return true;
  if (intent === ConversationIntent.BrowseMenu) return true;
  if (intent === ConversationIntent.TrackOrder) return true;
  if (intent === ConversationIntent.Payment) return true;
  // Clarify with no matching intent already covered by Unknown; keep engine for missing entities.
  if (kind === 'clarify' && intent === ConversationIntent.Unknown) return true;
  return false;
}

/**
 * Conversation Engine — workflow-first; LLM fallthrough signaled to the gateway.
 */
export class ConversationEngine implements IConversationEngine {
  constructor(
    private readonly sessionManager: ISessionManager,
    private readonly orchestratorFactory: (
      context: VoiceContext,
    ) => ConversationTurnOrchestrator = (ctx) =>
      createDefaultTurnOrchestrator({
        menu: ctx.menu ?? [],
        locale: ctx.preferredLanguage ?? 'en-IN',
      }),
  ) {}

  public async receiveTranscript(
    sessionId: string,
    transcript: string,
    context: VoiceContext,
  ): Promise<ConversationResult> {
    const ensure = context.ensureSession !== false;
    let session = await this.sessionManager.loadSession(sessionId);

    if (!session && ensure) {
      session = await this.sessionManager.ensureSession(
        sessionId,
        context.tenantId?.trim() || context.restaurantId?.trim() || 'tenant_unknown',
      );
    }

    if (!session) {
      return {
        snapshot: null,
        success: false,
        error: `Session ${sessionId} not found`,
        fallthroughToLlm: true,
      };
    }

    const now = Date.now();

    this.publishEvent({
      type: 'TranscriptReceived',
      sessionId,
      timestamp: now,
      transcript,
    });

    const orchestrator = this.orchestratorFactory(context);
    const turnOutput = orchestrator.handleTurn({
      rawTranscript: transcript,
      state: {
        ...session.snapshot.state,
        ...(context.preferredLanguage
          ? { currentLanguage: context.preferredLanguage }
          : {}),
      },
      now,
    });

    const userStep = {
      id: `step_${now}`,
      role: 'user' as const,
      message: transcript,
      timestamp: now,
    };

    const assistantReply = turnOutput.response.systemReply;
    const assistantStep = assistantReply
      ? {
          id: `step_${now}_assistant`,
          role: 'assistant' as const,
          message: assistantReply,
          timestamp: now + 1,
        }
      : null;

    const newSnapshot = {
      ...session.snapshot,
      snapshotId: `snap_${now}`,
      timestamp: now,
      recentSteps: [
        ...session.snapshot.recentSteps,
        userStep,
        ...(assistantStep ? [assistantStep] : []),
      ],
      state: turnOutput.nextState,
    };

    await this.sessionManager.updateSession(sessionId, newSnapshot);

    const fallthrough = shouldFallthroughToLlm(
      turnOutput.turn.intent,
      turnOutput.turn.kind,
    );

    if (fallthrough) {
      return {
        snapshot: newSnapshot,
        success: true,
        fallthroughToLlm: true,
        workflowDecision: turnOutput.turn.kind,
        workflowIntent: turnOutput.turn.intent,
        confidence: turnOutput.turn.confidence,
      };
    }

    return {
      snapshot: newSnapshot,
      success: true,
      fallthroughToLlm: false,
      systemReply: turnOutput.response.systemReply,
      proposedActions: turnOutput.response.proposedActions.map((a) => ({
        type: a.type,
        ...(a.payload ? { payload: a.payload } : {}),
      })),
      workflowDecision: turnOutput.turn.kind,
      workflowIntent: turnOutput.turn.intent,
      confidence: turnOutput.turn.confidence,
      ...(turnOutput.turn.kind === 'deny' && turnOutput.turn.reason
        ? { error: turnOutput.turn.reason }
        : {}),
    };
  }

  public publishEvent(event: ConversationEvent): void {
    if (process.env.DEBUG_CONVERSATION_EVENTS === 'true') {
      console.log(`[ConversationEngine Event] ${event.type} for session ${event.sessionId}`, event);
    }
  }
}
