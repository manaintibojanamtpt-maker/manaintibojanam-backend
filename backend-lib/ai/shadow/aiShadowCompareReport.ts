import type { GoldenCategory } from '../eval/types.js';
import type { AiAuditEventType } from '../auditContracts.js';
import type { AssistantIntent } from '../intentTaxonomy.js';
import type { AssistantChannel, AssistantMode } from '../types.js';

export const AI_SHADOW_COMPARE_SCHEMA_VERSION = '24.0' as const;

/** Flat assistant-shaped sample for offline golden-category comparison. */
export interface ShadowCompareSample {
  readonly message: string;
  readonly mode?: AssistantMode;
  readonly channel?: AssistantChannel;
  readonly modelText?: string;
  readonly reply?: string;
  readonly eventType?: AiAuditEventType;
  readonly errorCode?: string;
  readonly proposedActions?: readonly unknown[];
  readonly restaurantId?: string;
  readonly orderType?: string;
  readonly conversationId?: string;
  readonly orderContext?: Record<string, unknown>;
  readonly cartPlanStatus?: 'validated' | 'needs_clarification' | 'invalid';
  readonly sampleId?: string;
  readonly correlationId?: string;
  /** Live-recorded intent from audit capture — used to detect heuristic drift. */
  readonly observedIntent?: AssistantIntent;
}

export interface ShadowCategoryHit {
  readonly category: GoldenCategory;
  readonly caseId: string;
  readonly ok: boolean;
  readonly errors: readonly string[];
  readonly driftReasons: readonly string[];
}

export interface ShadowSampleCompareResult {
  readonly sampleId: string;
  readonly message: string;
  readonly categoriesRun: readonly GoldenCategory[];
  readonly categoryHits: readonly ShadowCategoryHit[];
  readonly drift: boolean;
  readonly driftReasons: readonly string[];
}

export interface ShadowCompareReport {
  readonly schemaVersion: typeof AI_SHADOW_COMPARE_SCHEMA_VERSION;
  readonly mutatedState: false;
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly driftCount: number;
  readonly results: readonly ShadowSampleCompareResult[];
}
