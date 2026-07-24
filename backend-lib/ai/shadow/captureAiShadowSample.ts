import { randomUUID } from 'crypto';
import type { AiAuditEvent } from '../auditContracts.js';
import { readAiShadowTrafficConfig } from '../aiShadowTrafficConfig.js';
import type { AssistantChannel, AssistantMode } from '../types.js';
import { appendAiShadowSample } from './aiShadowTrafficStore.js';
import {
  AI_SHADOW_SCHEMA_VERSION,
  type AiShadowAssistEnvelope,
  type AiShadowSample,
} from './aiShadowTrafficTypes.js';

const CAPTURE_EVENT_TYPES = new Set<AiAuditEvent['eventType']>([
  'ai.assist.request',
  'ai.assist.response',
  'ai.assist.blocked',
  'ai.cart_plan.request',
  'ai.cart_plan.response',
  'ai.cart_plan.blocked',
  'ai.cart_plan.invalid',
]);

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

export function auditEventToShadowSample(event: AiAuditEvent): AiShadowSample | null {
  if (!CAPTURE_EVENT_TYPES.has(event.eventType)) return null;

  const message = event.messagePreview?.trim() ?? '';
  const request: AiShadowAssistEnvelope = {
    mode: asAssistantMode(event.mode),
    channel: asAssistantChannel(event.channel),
    message,
    ...(event.conversationId ? { conversationId: event.conversationId } : {}),
  };

  return {
    schemaVersion: AI_SHADOW_SCHEMA_VERSION,
    id: randomUUID(),
    capturedAt: event.timestamp,
    request,
    audit: {
      correlationId: event.correlationId,
      sourceEventType: event.eventType,
      success: event.success,
      ...(event.intent ? { intent: event.intent } : {}),
      ...(event.model ? { model: event.model } : {}),
      ...(typeof event.latencyMs === 'number' ? { latencyMs: event.latencyMs } : {}),
      ...(typeof event.safetyBlocked === 'boolean' ? { safetyBlocked: event.safetyBlocked } : {}),
      ...(event.cartPlanStatus ? { cartPlanStatus: event.cartPlanStatus } : {}),
      ...(typeof event.planCount === 'number' ? { planCount: event.planCount } : {}),
      ...(event.errorCode ? { errorCode: event.errorCode } : {}),
    },
  };
}

/**
 * Non-user-visible capture hook — no provider calls, no UX impact.
 * Invoked from emitAiAuditEvent when AI_SHADOW_TRAFFIC_ENABLED=true.
 */
export function maybeCaptureAiShadowSample(event: AiAuditEvent): void {
  const config = readAiShadowTrafficConfig();
  if (!config.enabled) return;
  if (!CAPTURE_EVENT_TYPES.has(event.eventType)) return;
  if (config.sampleRate < 1 && Math.random() > config.sampleRate) return;

  const sample = auditEventToShadowSample(event);
  if (!sample) return;

  appendAiShadowSample(sample);
  // Phase 24: in-process only; persistence flag reserved for a later phase.
}
