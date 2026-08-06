/**
 * Purpose: Pure turn evaluator — IntentPipeline then ConversationPolicyEngine.
 * Public API: WorkflowEngine, WorkflowTurnResult, createDefaultWorkflowEngine
 * Dependencies: IntentPipeline, ConversationPolicyEngine, ConversationState
 * Consumers: Future ConversationEngine adapter (not wired yet)
 *
 * Non-goals: Session load/save, LLM calls, cart mutation, gateway I/O.
 */

import type { ConversationState } from '../models/ConversationState.js';
import type { ConversationEntity } from '../models/ConversationEntity.js';
import { ConversationIntent } from '../models/ConversationIntent.js';
import type { PolicyEvaluationResult } from './ConversationPolicyEngine.js';
import { ConversationPolicyEngine } from './ConversationPolicyEngine.js';
import type { IntentPipeline, IntentPipelineResult } from './intent/IntentPipeline.js';
import {
  createDefaultIntentPipeline,
  type CreateDefaultIntentPipelineOptions,
} from './intent/IntentPipeline.js';

export type WorkflowDecisionKind = 'proceed' | 'clarify' | 'deny';

export interface WorkflowTurnInput {
  readonly rawTranscript: string;
  readonly state: ConversationState;
}

export interface WorkflowTurnResult {
  readonly kind: WorkflowDecisionKind;
  readonly intent: ConversationIntent;
  readonly confidence: number;
  readonly entities: readonly ConversationEntity[];
  readonly extractedEntities: readonly ConversationEntity[];
  readonly normalizedTranscript: string;
  readonly requiresClarification: boolean;
  readonly reason?: string;
  readonly missingEntities?: readonly string[];
  readonly policy?: PolicyEvaluationResult;
  readonly pipeline: IntentPipelineResult;
}

export class WorkflowEngine {
  constructor(
    private readonly intentPipeline: IntentPipeline,
    private readonly policyEngine: ConversationPolicyEngine,
  ) {}

  /**
   * Evaluates one user turn without mutating session state.
   */
  public evaluateTurn(input: WorkflowTurnInput): WorkflowTurnResult {
    const pipeline = this.intentPipeline.run({
      rawTranscript: input.rawTranscript,
      context: { state: input.state },
    });

    const entities =
      pipeline.entities.length > 0 ? pipeline.entities : pipeline.extractedEntities;

    const base = {
      intent: pipeline.intent,
      confidence: pipeline.confidence,
      entities,
      extractedEntities: pipeline.extractedEntities,
      normalizedTranscript: pipeline.normalizedTranscript,
      requiresClarification: pipeline.requiresClarification,
      pipeline,
    };

    if (
      pipeline.intent === ConversationIntent.Unknown ||
      pipeline.requiresClarification
    ) {
      return {
        ...base,
        kind: 'clarify',
        reason:
          pipeline.clarificationReason ||
          (pipeline.intent === ConversationIntent.Unknown
            ? 'NoMatchingIntent'
            : 'Confidence below threshold'),
      };
    }

    const policy = this.policyEngine.evaluate(
      pipeline.intent,
      entities,
      input.state,
    );

    if (!policy.allowed) {
      if (policy.missingEntities && policy.missingEntities.length > 0) {
        return {
          ...base,
          kind: 'clarify',
          reason: policy.reason,
          missingEntities: policy.missingEntities,
          policy,
        };
      }
      return {
        ...base,
        kind: 'deny',
        reason: policy.reason || 'PolicyDenied',
        policy,
      };
    }

    return {
      ...base,
      kind: 'proceed',
      policy,
    };
  }
}

export function createDefaultWorkflowEngine(
  options: CreateDefaultIntentPipelineOptions = {},
): WorkflowEngine {
  return new WorkflowEngine(
    createDefaultIntentPipeline(options),
    new ConversationPolicyEngine(),
  );
}
