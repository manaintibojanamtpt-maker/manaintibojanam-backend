import type { AiAuditEvent } from '../auditContracts.js';
import {
  classifyPersonalizationIntent,
  isPersonalizationUserMessage,
} from '../../../orderbhojan/src/features/assistant/domain/isPersonalizationUserMessage.js';
import {
  classifyPostOrderHighRiskMessage,
  isPostOrderHighRiskMessage,
} from '../../../orderbhojan/src/features/assistant/domain/postOrderHighRiskIntents.js';
import type { AssistantChannel, AssistantMode } from '../types.js';
import type { AiShadowSample } from './aiShadowTrafficTypes.js';
import type { ShadowCompareSample } from './aiShadowCompareReport.js';

function asAssistantMode(mode: AiAuditEvent['mode']): AssistantMode {
  return mode === 'merchant_marketing' ? 'merchant_marketing' : 'consumer_ordering';
}

function asAssistantChannel(channel: AiAuditEvent['channel']): AssistantChannel {
  if (
    channel === 'orderbhojan_web' ||
    channel === 'orderbhojan_android' ||
    channel === 'bhojanos_marketing'
  ) {
    return channel;
  }
  return 'unknown';
}

/** Normalize flat assistant-shaped payloads into ShadowCompareSample. */
export function normalizeShadowCompareSample(
  raw:
    | ShadowCompareSample
    | AiShadowSample
    | {
        readonly message?: unknown;
        readonly mode?: unknown;
        readonly channel?: unknown;
        readonly modelText?: unknown;
        readonly reply?: unknown;
        readonly eventType?: unknown;
        readonly errorCode?: unknown;
        readonly proposedActions?: unknown;
        readonly restaurantId?: unknown;
        readonly orderType?: unknown;
        readonly conversationId?: unknown;
        readonly orderContext?: unknown;
        readonly cartPlanStatus?: unknown;
        readonly sampleId?: unknown;
        readonly correlationId?: unknown;
        readonly observedIntent?: unknown;
      },
): ShadowCompareSample {
  if (raw && typeof raw === 'object' && 'request' in raw && 'audit' in raw) {
    return mapAiShadowSampleToShadowInput(raw as AiShadowSample);
  }

  const flat = raw as ShadowCompareSample & Record<string, unknown>;
  const message = String(flat.message ?? '').trim();
  return {
    message,
    ...(flat.mode === 'merchant_marketing' || flat.mode === 'consumer_ordering'
      ? { mode: flat.mode }
      : {}),
    ...(typeof flat.channel === 'string' ? { channel: flat.channel as AssistantChannel } : {}),
    ...(typeof flat.modelText === 'string' ? { modelText: flat.modelText } : {}),
    ...(typeof flat.reply === 'string' ? { reply: flat.reply } : {}),
    ...(typeof flat.eventType === 'string' ? { eventType: flat.eventType as AiAuditEvent['eventType'] } : {}),
    ...(typeof flat.errorCode === 'string' ? { errorCode: flat.errorCode } : {}),
    ...(Array.isArray(flat.proposedActions) ? { proposedActions: flat.proposedActions } : {}),
    ...(typeof flat.restaurantId === 'string' ? { restaurantId: flat.restaurantId } : {}),
    ...(typeof flat.orderType === 'string' ? { orderType: flat.orderType } : {}),
    ...(typeof flat.conversationId === 'string' ? { conversationId: flat.conversationId } : {}),
    ...(flat.orderContext && typeof flat.orderContext === 'object'
      ? { orderContext: flat.orderContext as Record<string, unknown> }
      : {}),
    ...(flat.cartPlanStatus === 'validated' ||
    flat.cartPlanStatus === 'needs_clarification' ||
    flat.cartPlanStatus === 'invalid'
      ? { cartPlanStatus: flat.cartPlanStatus }
      : {}),
    ...(typeof flat.sampleId === 'string' ? { sampleId: flat.sampleId } : {}),
    ...(typeof flat.correlationId === 'string' ? { correlationId: flat.correlationId } : {}),
    ...(typeof flat.observedIntent === 'string'
      ? { observedIntent: flat.observedIntent as ShadowCompareSample['observedIntent'] }
      : {}),
  };
}

/** Map persisted AiAuditEvent fields to a flat shadow compare sample. */
export function mapAuditEventToShadowInput(event: AiAuditEvent): ShadowCompareSample {
  return {
    message: event.messagePreview?.trim() ?? '',
    mode: asAssistantMode(event.mode),
    channel: asAssistantChannel(event.channel),
    eventType: event.eventType,
    errorCode: event.errorCode,
    conversationId: event.conversationId,
    cartPlanStatus: event.cartPlanStatus,
    correlationId: event.correlationId,
    ...(event.intent ? { observedIntent: event.intent } : {}),
  };
}

/** Map captured AiShadowSample envelope to a flat shadow compare sample. */
export function mapAiShadowSampleToShadowInput(sample: AiShadowSample): ShadowCompareSample {
  return {
    message: sample.request.message,
    mode: sample.request.mode,
    channel: sample.request.channel,
    ...(sample.request.modelText ? { modelText: sample.request.modelText } : {}),
    ...(sample.request.proposedActions ? { proposedActions: sample.request.proposedActions } : {}),
    ...(sample.request.restaurantId ? { restaurantId: sample.request.restaurantId } : {}),
    ...(sample.request.orderType ? { orderType: sample.request.orderType } : {}),
    ...(sample.request.conversationId ? { conversationId: sample.request.conversationId } : {}),
    eventType: sample.audit.sourceEventType,
    errorCode: sample.audit.errorCode,
    cartPlanStatus: sample.audit.cartPlanStatus,
    sampleId: sample.id,
    correlationId: sample.audit.correlationId,
    ...(sample.audit.intent ? { observedIntent: sample.audit.intent } : {}),
  };
}

export function intentRunnerInput(sample: ShadowCompareSample): Record<string, unknown> {
  return {
    mode: sample.mode ?? 'consumer_ordering',
    message: sample.message,
  };
}

export function safetyClaimedSideEffectInput(
  sample: ShadowCompareSample,
): Record<string, unknown> | null {
  if (!sample.reply?.trim()) return null;
  return {
    kind: 'claimed_side_effect',
    reply: sample.reply,
  };
}

export function triageRunnerInput(sample: ShadowCompareSample): Record<string, unknown> | null {
  if (!isPostOrderHighRiskMessage(sample.message)) return null;
  return {
    kind: 'classify',
    message: sample.message,
    ...(sample.orderContext ? { orderContext: sample.orderContext } : {}),
  };
}

export function personalizationRunnerInput(
  sample: ShadowCompareSample,
): Record<string, unknown> | null {
  if (!isPersonalizationUserMessage(sample.message)) return null;
  return {
    kind: 'classify',
    message: sample.message,
  };
}

export function cartPlanParseRunnerInput(
  sample: ShadowCompareSample,
): Record<string, unknown> | null {
  const hasCartPayload =
    (sample.proposedActions?.length ?? 0) > 0 ||
    Boolean(sample.restaurantId) ||
    sample.eventType?.startsWith('ai.cart_plan.');
  if (!hasCartPayload) return null;

  return {
    mode: sample.mode ?? 'consumer_ordering',
    channel: sample.channel ?? 'orderbhojan_web',
    proposedActions: sample.proposedActions ?? [],
    ...(sample.restaurantId ? { restaurantId: sample.restaurantId } : {}),
    ...(sample.orderType ? { orderType: sample.orderType } : {}),
    ...(sample.conversationId ? { conversationId: sample.conversationId } : {}),
  };
}

export function clarificationRunnerInput(
  sample: ShadowCompareSample,
): Record<string, unknown> | null {
  const base = cartPlanParseRunnerInput(sample);
  if (!base) return null;
  if (
    sample.cartPlanStatus !== 'needs_clarification' &&
    sample.eventType !== 'ai.cart_plan.invalid'
  ) {
    return null;
  }
  return base;
}

/** Soft programmatic expects for shadow samples without golden fixture rows. */
export function buildIntentSoftExpect(sample: ShadowCompareSample): Record<string, unknown> {
  const mode = sample.mode ?? 'consumer_ordering';
  const message = sample.message;
  const text = message.trim().toLowerCase();

  if (/\b(cancel|cancellation|cancelling|canceling)\b/.test(text)) {
    return { intent: 'cancel_order', allowedForMode: true };
  }
  if (/\b(refund|money back|charged twice|double.?charg)/.test(text)) {
    return { intent: 'refund', allowedForMode: true };
  }
  if (
    /\b(payment failed|payment (not |never )?confirm|amount deducted|money deducted|upi.*(pending|failed|stuck)|razorpay.*(fail|pending)|paid but)\b/.test(
      text,
    )
  ) {
    return { intent: 'payment_issue', allowedForMode: true };
  }

  if (sample.observedIntent) {
    return {
      intent: sample.observedIntent,
      allowedForMode: true,
    };
  }

  return { allowedForMode: true };
}

export function buildSafetySoftExpect(reply: string): Record<string, unknown> | null {
  const text = reply.trim();
  if (!text) return null;

  if (
    /\b((your )?refund (has been|was|is being) (processed|issued|completed|sent)|money (has been|was) (returned|refunded))\b/i.test(
      text,
    ) ||
    /\b(i (have|'ve)|we (have|'ve)|your order (has been|was))\s+(cancelled|canceled|refunded)\b/i.test(
      text,
    ) ||
    /\b(added to (your )?cart|order (has been )?placed|payment (was )?captured)\b/i.test(text)
  ) {
    return { claimed: true };
  }

  if (
    /\b(cannot|can't|unable to|email support|open tracking|I can help you understand|pending confirmation)\b/i.test(
      text,
    )
  ) {
    return { claimed: false };
  }

  return null;
}

export function buildTriageSoftExpect(sample: ShadowCompareSample): Record<string, unknown> {
  const riskKind = classifyPostOrderHighRiskMessage(sample.message);
  return {
    highRisk: true,
    ...(riskKind ? { riskKind } : {}),
    hasGuidance: true,
  };
}

export function buildPersonalizationSoftExpect(sample: ShadowCompareSample): Record<string, unknown> {
  const intent = classifyPersonalizationIntent(sample.message);
  return {
    intent,
    isPersonalization: intent !== 'none',
  };
}

export function buildCartPlanSoftExpect(sample: ShadowCompareSample): Record<string, unknown> {
  if (sample.cartPlanStatus === 'needs_clarification') {
    return { ok: false, hasClarification: true };
  }
  if (sample.cartPlanStatus === 'invalid' || sample.eventType === 'ai.cart_plan.invalid') {
    return { ok: false };
  }
  if (sample.cartPlanStatus === 'validated' || sample.eventType === 'ai.cart_plan.response') {
    return { ok: true };
  }
  return { ok: true };
}

export function buildClarificationSoftExpect(sample: ShadowCompareSample): Record<string, unknown> {
  return {
    ok: false,
    hasClarification: true,
  };
}
