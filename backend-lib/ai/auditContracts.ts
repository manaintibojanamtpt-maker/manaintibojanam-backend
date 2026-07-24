import type { AssistantChannel, AssistantMode } from './types.js';
import type { AssistantIntent } from './intentTaxonomy.js';
import type { SafetyViolationCode } from './safetyGuardrails.js';

export const AI_AUDIT_SCHEMA_VERSION = '21.0' as const;

export const AI_AUDIT_EVENT_TYPES = [
  'ai.assist.request',
  'ai.assist.response',
  'ai.assist.blocked',
  'ai.assist.provider_error',
  'ai.assist.disabled',
  'ai.cart_plan.request',
  'ai.cart_plan.response',
  'ai.cart_plan.blocked',
  'ai.cart_plan.invalid',
  'ai.cart_plan.disabled',
  /** Client confirm after validated plan — cart mutation is still client-local. */
  'ai.cart_plan.confirmed',
  /** Client discard — nothing applied. */
  'ai.cart_plan.discarded',
] as const;

export type AiAuditEventType = (typeof AI_AUDIT_EVENT_TYPES)[number];

export interface AiAuditEvent {
  readonly schemaVersion: typeof AI_AUDIT_SCHEMA_VERSION;
  readonly eventType: AiAuditEventType;
  readonly timestamp: string;
  readonly correlationId: string;
  readonly conversationId?: string;
  readonly mode?: AssistantMode;
  readonly channel?: AssistantChannel;
  readonly intent?: AssistantIntent;
  readonly model?: string;
  readonly latencyMs?: number;
  readonly success: boolean;
  readonly safetyBlocked?: boolean;
  readonly violationCodes?: readonly SafetyViolationCode[];
  /** Truncated / redacted user text — never raw secrets. */
  readonly messagePreview?: string;
  readonly errorCode?: string;
  readonly phase: 2 | 3 | 4;
  readonly mutatedState: false;
  readonly platform?: 'web' | 'android' | 'marketing' | 'unknown';
  readonly cartPlanStatus?: 'validated' | 'needs_clarification' | 'invalid';
  readonly planCount?: number;
  /** Truncated cohort / routing key (already hashed client-side when from OrderBhojan). */
  readonly canaryRoutingKey?: string;
  /** Percentage bucket 0–99 from stableBucket(routingKey). */
  readonly canaryBucket?: number;
  /** True when percentage/health filtering was applied for this request. */
  readonly canaryGateApplied?: boolean;
  readonly canaryGateReason?: string;
}

export function redactMessagePreview(message: string, maxLen = 120): string {
  const collapsed = message.replace(/\s+/g, ' ').trim();
  // Light PII redaction for audit previews
  const redacted = collapsed
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[redacted-email]')
    .replace(/\b(\+?\d[\d\s-]{8,}\d)\b/g, '[redacted-phone]')
    .replace(/\b(?:sk-|or-)[a-zA-Z0-9]{10,}\b/g, '[redacted-secret]');
  if (redacted.length <= maxLen) return redacted;
  return `${redacted.slice(0, maxLen)}…`;
}

export function channelToPlatform(
  channel: AssistantChannel | undefined,
): AiAuditEvent['platform'] {
  if (channel === 'orderbhojan_web') return 'web';
  if (channel === 'orderbhojan_android') return 'android';
  if (channel === 'bhojanos_marketing') return 'marketing';
  return 'unknown';
}

export function buildAiAuditEvent(
  partial: Omit<AiAuditEvent, 'schemaVersion' | 'timestamp' | 'mutatedState' | 'phase'> & {
    readonly timestamp?: string;
    readonly phase?: 2 | 3 | 4;
  },
): AiAuditEvent {
  const phase =
    partial.phase ??
    (partial.eventType.startsWith('ai.cart_plan.') ? 4 : partial.eventType.startsWith('ai.assist.') ? 3 : 2);
  return {
    schemaVersion: AI_AUDIT_SCHEMA_VERSION,
    timestamp: partial.timestamp ?? new Date().toISOString(),
    phase,
    mutatedState: false,
    eventType: partial.eventType,
    correlationId: partial.correlationId,
    success: partial.success,
    ...(partial.conversationId ? { conversationId: partial.conversationId } : {}),
    ...(partial.mode ? { mode: partial.mode } : {}),
    ...(partial.channel ? { channel: partial.channel } : {}),
    ...(partial.intent ? { intent: partial.intent } : {}),
    ...(partial.model ? { model: partial.model } : {}),
    ...(typeof partial.latencyMs === 'number' ? { latencyMs: partial.latencyMs } : {}),
    ...(typeof partial.safetyBlocked === 'boolean' ? { safetyBlocked: partial.safetyBlocked } : {}),
    ...(partial.violationCodes?.length ? { violationCodes: partial.violationCodes } : {}),
    ...(partial.messagePreview ? { messagePreview: partial.messagePreview } : {}),
    ...(partial.errorCode ? { errorCode: partial.errorCode } : {}),
    ...(partial.cartPlanStatus ? { cartPlanStatus: partial.cartPlanStatus } : {}),
    ...(typeof partial.planCount === 'number' ? { planCount: partial.planCount } : {}),
    ...(partial.canaryRoutingKey ? { canaryRoutingKey: partial.canaryRoutingKey } : {}),
    ...(typeof partial.canaryBucket === 'number' ? { canaryBucket: partial.canaryBucket } : {}),
    ...(typeof partial.canaryGateApplied === 'boolean'
      ? { canaryGateApplied: partial.canaryGateApplied }
      : {}),
    ...(partial.canaryGateReason ? { canaryGateReason: partial.canaryGateReason } : {}),
    platform: partial.platform ?? channelToPlatform(partial.channel),
  };
}
