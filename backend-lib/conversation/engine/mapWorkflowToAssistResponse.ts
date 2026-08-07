/**
 * Purpose: Map workflow ConversationResult → AiAssistResponse without LLM.
 * Public API: mapWorkflowToAssistResponse, mapConversationIntentToAssistantIntent
 * Dependencies: ConversationIntent, AiAssistResponse, structuredOutput types
 * Consumers: registerAiGatewayRoutes (active ConversationEngine path)
 */

import { ConversationIntent } from '../models/ConversationIntent.js';
import type { ConversationResult } from '../models/ConversationResult.js';
import type { AiAssistResponse } from '../../ai/assistResponse.js';
import type { AiProposedAction, AiStructuredAssistResult } from '../../ai/structuredOutput.js';
import { AI_STRUCTURED_SCHEMA_VERSION } from '../../ai/structuredOutput.js';
import type { AssistantIntent } from '../../ai/intentTaxonomy.js';
import type { AssistantChannel, AssistantMode } from '../../ai/types.js';
import { getAllowedCapabilities } from '../../ai/assistantModeRouter.js';

export function mapConversationIntentToAssistantIntent(
  intent: ConversationIntent | string | null | undefined,
  mode: AssistantMode,
): AssistantIntent {
  if (mode === 'merchant_marketing') {
    return 'general_help';
  }
  switch (intent) {
    case ConversationIntent.Greeting:
      return 'greet';
    case ConversationIntent.BrowseMenu:
      return 'browse_restaurants';
    case ConversationIntent.AddItem:
    case ConversationIntent.ModifyItem:
    case ConversationIntent.RemoveItem:
      return 'search_menu';
    case ConversationIntent.Checkout:
      return 'checkout_explain';
    case ConversationIntent.ScheduleDelivery:
      return 'cart_question';
    case ConversationIntent.Payment:
      return 'payment_help';
    case ConversationIntent.TrackOrder:
      return 'order_status_help';
    case ConversationIntent.Help:
      return 'general_help';
    case ConversationIntent.Confirmation:
      return 'cart_question';
    case ConversationIntent.Cancel:
      return 'general_help';
    default:
      return 'general_help';
  }
}

function mapWorkflowAction(
  raw: Record<string, unknown>,
  restaurantId?: string,
): AiProposedAction | null {
  const type = typeof raw.type === 'string' ? raw.type : '';
  const payload =
    raw.payload && typeof raw.payload === 'object' && !Array.isArray(raw.payload)
      ? (raw.payload as Record<string, unknown>)
      : undefined;

  if (type === 'add_item') {
    const foodId =
      (typeof payload?.menuItemId === 'string' && payload.menuItemId) ||
      (typeof payload?.foodId === 'string' && payload.foodId) ||
      undefined;
    const name = typeof payload?.name === 'string' ? payload.name : undefined;
    const quantity =
      typeof payload?.quantity === 'number' && Number.isFinite(payload.quantity)
        ? Math.max(1, Math.floor(payload.quantity))
        : 1;
    return {
      type: 'cart_add_plan',
      requiresConfirmation: true,
      executable: false,
      payload: {
        ...(foodId ? { foodId } : {}),
        ...(name ? { name } : {}),
        quantity,
        ...(restaurantId ? { restaurantId } : {}),
      },
    };
  }

  if (type === 'ask_clarification' || type === 'greet' || type === 'noop' || type === 'confirmation') {
    const payloadReason = typeof payload?.reason === 'string' ? payload.reason : '';
    const missing = Array.isArray(payload?.missingEntities)
      ? payload.missingEntities.filter((x): x is string => typeof x === 'string')
      : [];
    const isScheduleClarify =
      type === 'ask_clarification' &&
      (payloadReason === 'AmbiguousDeliveryTime' ||
        payloadReason === 'InvalidDeliveryTime' ||
        payloadReason === 'MissingDeliveryTime' ||
        payloadReason === 'OutOfHorizonDeliveryTime' ||
        missing.includes('DeliveryTime'));
    return {
      type: 'none',
      requiresConfirmation: false,
      executable: false,
      ...(payload
        ? {
            payload: {
              ...payload,
              ...(isScheduleClarify ? { action: 'schedule_clarify' } : {}),
            },
          }
        : {}),
      ...(isScheduleClarify
        ? { reason: 'schedule_clarify' }
        : typeof raw.reason === 'string'
          ? { reason: raw.reason }
          : {}),
    };
  }

  if (type === 'checkout') {
    return {
      type: 'navigate',
      requiresConfirmation: true,
      executable: false,
      payload: { path: '/checkout', ...(payload ?? {}) },
    };
  }

  // Schedule metadata only — never places an order / touches payment.
  if (type === 'set_delivery_schedule') {
    return {
      type: 'none',
      requiresConfirmation: false,
      executable: false,
      payload: {
        action: 'set_delivery_schedule',
        ...(payload ?? {}),
      },
      reason: 'set_delivery_schedule',
    };
  }

  if (type === 'cancel' || type === 'policy_denied') {
    return {
      type: 'none',
      requiresConfirmation: false,
      executable: false,
      ...(payload ? { payload } : {}),
    };
  }

  return null;
}

export function mapWorkflowToAssistResponse(params: {
  readonly result: ConversationResult;
  readonly mode: AssistantMode;
  readonly channel: AssistantChannel;
  readonly conversationId: string;
  readonly restaurantId?: string;
  readonly readOnlyConsumer: boolean;
}): AiAssistResponse {
  const reply = (params.result.systemReply ?? '').trim() || 'Okay.';
  const workflowIntent = params.result.workflowIntent ?? null;
  const intent = mapConversationIntentToAssistantIntent(workflowIntent, params.mode);

  const proposedActions: AiProposedAction[] = [];
  for (const raw of params.result.proposedActions ?? []) {
    if (!raw || typeof raw !== 'object') continue;
    const mapped = mapWorkflowAction(raw as Record<string, unknown>, params.restaurantId);
    if (mapped) proposedActions.push(mapped);
  }
  if (proposedActions.length === 0) {
    proposedActions.push({ type: 'none', requiresConfirmation: false, executable: false });
  }

  const structured: AiStructuredAssistResult = {
    schemaVersion: AI_STRUCTURED_SCHEMA_VERSION,
    mode: params.mode,
    channel: params.channel,
    intent,
    reply,
    confidence:
      typeof params.result.confidence === 'number' && Number.isFinite(params.result.confidence)
        ? Math.min(1, Math.max(0, params.result.confidence))
        : 0.85,
    proposedActions,
    safety: {
      blocked: params.result.workflowDecision === 'deny',
      reasons:
        params.result.workflowDecision === 'deny' && params.result.error
          ? [params.result.error]
          : [],
    },
  };

  return {
    success: true,
    schemaVersion: '2.0',
    mode: params.mode,
    channel: params.channel,
    conversationId: params.conversationId,
    reply,
    intent,
    structured,
    allowedCapabilities: getAllowedCapabilities(params.mode),
    sideEffects: [],
    provider: {
      name: 'conversation_engine',
      model: 'workflow/v1',
    },
    meta: {
      gatewayEnabled: true,
      phase: 3,
      mutatedState: false,
      structuredSource: 'heuristic_wrap',
      safetyAllowed: !structured.safety.blocked,
      readOnlyConsumer: params.readOnlyConsumer,
    },
  };
}
