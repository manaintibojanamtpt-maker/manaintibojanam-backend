import type { AiAuditEventType } from '../auditContracts.js';
import type { AssistantIntent } from '../intentTaxonomy.js';
import type { GoldenCategory, GoldenCaseResult } from '../eval/types.js';
import type { AssistantChannel, AssistantMode } from '../types.js';

export const AI_SHADOW_SCHEMA_VERSION = '24.0' as const;

/** Assistant-shaped request envelope captured from live audit traffic. */
export interface AiShadowAssistEnvelope {
  readonly mode: AssistantMode;
  readonly channel: AssistantChannel;
  readonly message: string;
  readonly conversationId?: string;
  /** Structured provider output when captured from response audit fields. */
  readonly modelText?: string;
  readonly proposedActions?: readonly unknown[];
  readonly restaurantId?: string;
  readonly orderType?: string;
}

export interface AiShadowCapturedAuditFields {
  readonly correlationId: string;
  readonly sourceEventType: AiAuditEventType;
  readonly intent?: AssistantIntent;
  readonly model?: string;
  readonly latencyMs?: number;
  readonly success: boolean;
  readonly safetyBlocked?: boolean;
  readonly cartPlanStatus?: 'validated' | 'needs_clarification' | 'invalid';
  readonly planCount?: number;
  readonly errorCode?: string;
}

export interface AiShadowSample {
  readonly schemaVersion: typeof AI_SHADOW_SCHEMA_VERSION;
  readonly id: string;
  readonly capturedAt: string;
  readonly request: AiShadowAssistEnvelope;
  readonly audit: AiShadowCapturedAuditFields;
}

export interface AiShadowReplaySampleCheck {
  readonly sampleId: string;
  readonly correlationId: string;
  readonly inferredCategories: readonly GoldenCategory[];
  readonly checks: readonly GoldenCaseResult[];
}

export interface AiShadowReplayReport {
  readonly schemaVersion: typeof AI_SHADOW_SCHEMA_VERSION;
  readonly mutatedState: false;
  readonly shadowSampleCount: number;
  readonly goldenBaselinePassed: number;
  readonly goldenBaselineFailed: number;
  readonly goldenBaselineTotal: number;
  readonly shadowChecks: readonly AiShadowReplaySampleCheck[];
  readonly shadowChecksPassed: number;
  readonly shadowChecksFailed: number;
}
