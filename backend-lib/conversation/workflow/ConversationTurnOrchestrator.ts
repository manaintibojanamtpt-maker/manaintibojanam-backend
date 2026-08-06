/**
 * Purpose: Pure end-to-end turn orchestration — workflow evaluate + reply map + state projection.
 * Public API: ConversationTurnOrchestrator, ConversationTurnOutput, createDefaultTurnOrchestrator
 * Dependencies: WorkflowEngine, WorkflowResponseMapper, ConversationState
 * Consumers: Future ConversationEngine adapter (not wired yet)
 *
 * Non-goals: SessionManager I/O, ConversationEngine mutation, LLM, cart execution.
 */

import type { ConversationState } from '../models/ConversationState.js';
import { ConversationStatus } from '../models/ConversationState.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import type {
  CreateDefaultIntentPipelineOptions,
} from './intent/IntentPipeline.js';
import {
  WorkflowEngine,
  createDefaultWorkflowEngine,
  type WorkflowTurnResult,
} from './WorkflowEngine.js';
import {
  WorkflowResponseMapper,
  type WorkflowTurnResponse,
} from './WorkflowResponseMapper.js';

export interface ConversationTurnInput {
  readonly rawTranscript: string;
  readonly state: ConversationState;
  /** Optional clock for deterministic tests. */
  readonly now?: number;
}

export interface ConversationTurnOutput {
  readonly turn: WorkflowTurnResult;
  readonly response: WorkflowTurnResponse;
  /** Next state proposal — caller persists later; this module does not. */
  readonly nextState: ConversationState;
}

export class ConversationTurnOrchestrator {
  constructor(
    private readonly workflowEngine: WorkflowEngine,
    private readonly responseMapper: WorkflowResponseMapper,
  ) {}

  /**
   * Runs one conversation turn without loading or saving sessions.
   */
  public handleTurn(input: ConversationTurnInput): ConversationTurnOutput {
    const turn = this.workflowEngine.evaluateTurn({
      rawTranscript: input.rawTranscript,
      state: input.state,
    });
    const response = this.responseMapper.map(turn);
    const nextState = this.projectNextState(
      input.state,
      turn,
      response,
      input.now ?? Date.now(),
    );

    return { turn, response, nextState };
  }

  /**
   * Pure state projection from the current turn decision.
   */
  public projectNextState(
    state: ConversationState,
    turn: WorkflowTurnResult,
    response: WorkflowTurnResponse,
    now: number,
  ): ConversationState {
    const status = this.nextStatus(turn.kind, state.status);
    const pendingQuestion =
      turn.kind === 'clarify' ? response.systemReply : null;
    const pendingConfirmation =
      turn.kind === 'proceed' && turn.intent === ConversationIntent.Confirmation
        ? false
        : state.pendingConfirmation;

    return {
      ...state,
      currentIntent: turn.intent,
      detectedEntities: turn.entities,
      currentWorkflowStep: turn.kind,
      pendingQuestion,
      pendingConfirmation,
      status,
      updatedTime: now,
      metadata: {
        ...state.metadata,
        lastDecision: turn.kind,
        lastConfidence: turn.confidence,
      },
    };
  }

  private nextStatus(
    kind: WorkflowTurnResult['kind'],
    previous: ConversationStatus,
  ): ConversationStatus {
    switch (kind) {
      case 'clarify':
        return ConversationStatus.WaitingForClarification;
      case 'deny':
        return ConversationStatus.Listening;
      case 'proceed':
        return ConversationStatus.Speaking;
      default:
        return previous;
    }
  }
}

export function createDefaultTurnOrchestrator(
  options: CreateDefaultIntentPipelineOptions = {},
): ConversationTurnOrchestrator {
  return new ConversationTurnOrchestrator(
    createDefaultWorkflowEngine(options),
    new WorkflowResponseMapper(),
  );
}
