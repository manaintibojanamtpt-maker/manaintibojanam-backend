import { createMarketplaceHttpClient } from '@/marketplace-api/client';
import { MarketplaceApiError, mapUnknownError } from '@/marketplace-api/errors';
import {
  normalizeCartPlanActions,
  normalizeCartPlanIssues,
  normalizeClarificationQuestions,
  type CartPlanValidationRequest,
  type CartPlanValidationResult,
} from '../domain/cartPlanContract';
import type {
  PostOrderAssistRequest,
  PostOrderAssistResult,
} from '../domain/postOrderAssistContract';
import { toPostOrderHints } from '../domain/postOrderPolicy';
import { resolveConsumerAssistChannel } from '../domain/resolveConsumerAssistChannel';
import { buildAiCanaryRequestAttachment } from '../domain/buildAiCanaryRequestAttachment';
import { toConsumerHints } from '../domain/readOnlyPolicy';
import {
  AssistantApiError,
  type ConsumerAssistChannel,
  type ConsumerAssistRequest,
  type ConsumerAssistResult,
} from '../types';
// note: proposedCartActions stay non-executable (normalizeCartPlanActions)

function withCanaryBody<T extends Record<string, unknown>>(
  body: T,
): { body: T & { routingKey?: string }; headers?: Record<string, string> } {
  const canary = buildAiCanaryRequestAttachment();
  if (!canary) return { body };
  return {
    body: { ...body, routingKey: canary.routingKey },
    headers: { ...canary.headers },
  };
}

interface GatewayAssistSuccess {
  readonly success: true;
  readonly schemaVersion: string;
  readonly conversationId: string;
  readonly reply: string;
  readonly intent: string;
  readonly channel?: string;
  readonly structured?: {
    readonly safety?: { readonly blocked?: boolean };
    readonly proposedActions?: unknown;
  };
  readonly provider?: { readonly model?: string };
  readonly sideEffects?: unknown;
  readonly meta?: { readonly mutatedState?: boolean; readonly readOnlyConsumer?: boolean };
}

interface GatewayCartPlanValidateResponse {
  readonly success?: boolean;
  readonly schemaVersion?: string;
  readonly conversationId?: string;
  readonly channel?: string;
  readonly status?: 'validated' | 'needs_clarification' | 'invalid';
  readonly clarificationQuestions?: unknown;
  readonly issues?: unknown;
  readonly plans?: unknown;
  readonly proposedActions?: unknown;
  readonly sideEffects?: unknown;
  readonly mutatedState?: boolean;
}

function resolveChannel(): ConsumerAssistChannel {
  return resolveConsumerAssistChannel();
}

function mapAssistError(error: unknown): AssistantApiError {
  if (error instanceof AssistantApiError) return error;

  const mapped = mapUnknownError(error);
  const status = mapped.status;
  const correlationId = mapped.correlationId;

  if (status === 429 || mapped.code === 'HTTP_429' || mapped.code === 'AI_RATE_LIMITED') {
    return new AssistantApiError({
      code: 'AI_RATE_LIMITED',
      message: 'AI rate limit reached. Please wait and try again.',
      retryable: true,
      status: 429,
      correlationId,
    });
  }

  if (status === 503 || mapped.code === 'HTTP_503') {
    return new AssistantApiError({
      code: 'AI_UNAVAILABLE',
      message: mapped.message || 'AI assistant is unavailable.',
      retryable: false,
      status: 503,
      correlationId,
    });
  }

  if (status === 422) {
    return new AssistantApiError({
      code: 'AI_SAFETY_BLOCKED',
      message: mapped.message || 'Assistant response blocked by safety rules.',
      retryable: false,
      status: 422,
      correlationId,
    });
  }

  if (status === 403) {
    if (mapped.code === 'AI_CANARY_EXCLUDED') {
      return new AssistantApiError({
        code: 'AI_CANARY_EXCLUDED',
        message: mapped.message || 'AI canary rollout excluded this request.',
        retryable: false,
        status: 403,
        correlationId,
      });
    }
    if (mapped.code === 'AI_CANARY_HEALTH_GATE') {
      return new AssistantApiError({
        code: 'AI_CANARY_HEALTH_GATE',
        message: mapped.message || 'AI canary health gate blocked this request.',
        retryable: true,
        status: 403,
        correlationId,
      });
    }
    return new AssistantApiError({
      code: 'AI_MODE_FORBIDDEN',
      message: mapped.message || 'Assistant mode is not allowed for this channel.',
      retryable: false,
      status: 403,
      correlationId,
    });
  }

  if (mapped.code === 'NETWORK_ERROR' || mapped.code === 'TIMEOUT') {
    return new AssistantApiError({
      code: 'NETWORK_ERROR',
      message: mapped.message,
      retryable: true,
      status,
      correlationId,
    });
  }

  return new AssistantApiError({
    code: 'UNKNOWN',
    message: mapped.message,
    retryable: false,
    status,
    correlationId,
  });
}

function toConsumerResult(payload: GatewayAssistSuccess, channel: ConsumerAssistChannel): ConsumerAssistResult {
  const proposedCartActions = normalizeCartPlanActions(payload.structured?.proposedActions);
  return {
    schemaVersion: '3.0',
    conversationId: payload.conversationId,
    channel,
    reply: payload.reply,
    intent: payload.intent,
    safetyBlocked: payload.structured?.safety?.blocked === true,
    suggestedHints: toConsumerHints(payload.structured?.proposedActions),
    proposedCartActions,
    ...(payload.provider?.model ? { providerModel: payload.provider.model } : {}),
    sideEffects: [],
    mutatedState: false,
  };
}

function toPostOrderResult(
  payload: GatewayAssistSuccess,
  channel: ConsumerAssistChannel,
  orderContextUsed: boolean,
): PostOrderAssistResult {
  return {
    schemaVersion: '10.0',
    conversationId: payload.conversationId,
    channel,
    reply: payload.reply,
    intent: payload.intent,
    orderContextUsed,
    safetyBlocked: payload.structured?.safety?.blocked === true,
    suggestedHints: toPostOrderHints(payload.structured?.proposedActions),
    ...(payload.provider?.model ? { providerModel: payload.provider.model } : {}),
    sideEffects: [],
    mutatedState: false,
  };
}

function toCartPlanValidationResult(
  payload: GatewayCartPlanValidateResponse,
  channel: ConsumerAssistChannel,
): CartPlanValidationResult {
  const status =
    payload.status === 'validated' ||
    payload.status === 'needs_clarification' ||
    payload.status === 'invalid'
      ? payload.status
      : payload.success === false
        ? 'invalid'
        : 'needs_clarification';

  const proposedActions = normalizeCartPlanActions(payload.plans ?? payload.proposedActions);

  const schemaVersion =
    payload.schemaVersion === '5.0' || payload.schemaVersion === '4.0'
      ? payload.schemaVersion
      : '5.0';

  return {
    schemaVersion,
    conversationId:
      typeof payload.conversationId === 'string' && payload.conversationId.trim()
        ? payload.conversationId
        : 'unknown',
    channel,
    status,
    valid: status === 'validated',
    clarificationQuestions: normalizeClarificationQuestions(payload.clarificationQuestions),
    issues: normalizeCartPlanIssues(payload.issues),
    proposedActions,
    executable: false,
    sideEffects: [],
    mutatedState: false,
  };
}

/**
 * Server-backed consumer assist + cart plan validation client.
 * Uses zero HTTP retries so 429 surfaces as a typed retryable error (caller decides).
 * Does not import cart/checkout modules and never executes suggestedHints or proposedActions.
 */
export class AssistantApiClient {
  private readonly http = createMarketplaceHttpClient({ retryAttempts: 0 });

  resolveChannel(): ConsumerAssistChannel {
    return resolveChannel();
  }

  async getStatus(signal?: AbortSignal): Promise<{
    enabled: boolean;
    ready: boolean;
    phase: number;
  }> {
    try {
      const canary = buildAiCanaryRequestAttachment();
      const payload = await this.http.request<{
        enabled?: boolean;
        ready?: boolean;
        phase?: number;
      }>({
        path: '/api/ai/v1/status',
        method: 'GET',
        signal,
        ...(canary?.headers ? { headers: { ...canary.headers } } : {}),
      });
      return {
        enabled: payload.enabled === true,
        ready: payload.ready === true,
        phase: typeof payload.phase === 'number' ? payload.phase : 0,
      };
    } catch (error) {
      throw mapAssistError(error);
    }
  }

  async consumerAssist(request: ConsumerAssistRequest): Promise<ConsumerAssistResult> {
    const channel = resolveChannel();
    const message = request.message.trim();
    if (!message) {
      throw new AssistantApiError({
        code: 'AI_INVALID_REQUEST',
        message: 'message must be a non-empty string',
        retryable: false,
      });
    }

    try {
      const { body, headers } = withCanaryBody({
        mode: 'consumer_ordering',
        channel,
        message,
        readOnly: true,
        ...(request.conversationId ? { conversationId: request.conversationId } : {}),
      });
      const payload = await this.http.request<GatewayAssistSuccess>({
        path: '/api/ai/v1/assist',
        method: 'POST',
        authToken: request.authToken,
        signal: request.signal,
        body,
        ...(headers ? { headers } : {}),
      });

      if (!payload || payload.success !== true) {
        throw new AssistantApiError({
          code: 'AI_PROVIDER_ERROR',
          message: 'Unexpected assistant response',
          retryable: false,
        });
      }

      return toConsumerResult(payload, channel);
    } catch (error) {
      if (error instanceof MarketplaceApiError) {
        throw mapAssistError(error);
      }
      throw mapAssistError(error);
    }
  }

  /**
   * Post-order read-only assist — same gateway endpoint with optional order context.
   * Does not fetch orders; does not execute suggestedHints.
   */
  async postOrderAssist(request: PostOrderAssistRequest): Promise<PostOrderAssistResult> {
    const channel = resolveChannel();
    const message = request.message.trim();
    if (!message) {
      throw new AssistantApiError({
        code: 'AI_INVALID_REQUEST',
        message: 'message must be a non-empty string',
        retryable: false,
      });
    }

    const orderContext = request.orderContext;
    const orderContextUsed = Boolean(
      orderContext?.orderId ||
        orderContext?.guestPhone ||
        orderContext?.snapshot,
    );

    try {
      const { body, headers } = withCanaryBody({
        mode: 'consumer_ordering',
        channel,
        message,
        readOnly: true,
        ...(request.conversationId ? { conversationId: request.conversationId } : {}),
        ...(orderContextUsed
          ? {
              context: {
                orderContext: {
                  ...(orderContext?.orderId ? { orderId: orderContext.orderId } : {}),
                  ...(orderContext?.guestPhone ? { guestPhone: orderContext.guestPhone } : {}),
                  ...(orderContext?.snapshot ? { snapshot: orderContext.snapshot } : {}),
                },
              },
            }
          : {}),
      });
      const payload = await this.http.request<GatewayAssistSuccess>({
        path: '/api/ai/v1/assist',
        method: 'POST',
        authToken: request.authToken,
        signal: request.signal,
        body,
        ...(headers ? { headers } : {}),
      });

      if (!payload || payload.success !== true) {
        throw new AssistantApiError({
          code: 'AI_PROVIDER_ERROR',
          message: 'Unexpected assistant response',
          retryable: false,
        });
      }

      return toPostOrderResult(payload, channel, orderContextUsed);
    } catch (error) {
      if (error instanceof MarketplaceApiError) {
        throw mapAssistError(error);
      }
      throw mapAssistError(error);
    }
  }

  async validateCartPlan(request: CartPlanValidationRequest): Promise<CartPlanValidationResult> {
    const channel = resolveChannel();
    const restaurantId = request.restaurantId?.trim();
    if (!restaurantId) {
      throw new AssistantApiError({
        code: 'AI_INVALID_REQUEST',
        message: 'restaurantId is required',
        retryable: false,
      });
    }
    if (!Array.isArray(request.proposedActions)) {
      throw new AssistantApiError({
        code: 'AI_INVALID_REQUEST',
        message: 'proposedActions must be an array',
        retryable: false,
      });
    }

    try {
      const { body, headers } = withCanaryBody({
        mode: 'consumer_ordering',
        channel,
        restaurantId,
        proposedActions: request.proposedActions,
        readOnly: true,
        ...(request.orderType ? { orderType: request.orderType } : {}),
        ...(request.contextToken ? { contextToken: request.contextToken } : {}),
        ...(request.conversationId ? { conversationId: request.conversationId } : {}),
      });
      const payload = await this.http.request<GatewayCartPlanValidateResponse>({
        path: '/api/ai/v1/consumer/cart-plan/validate',
        method: 'POST',
        authToken: request.authToken,
        signal: request.signal,
        body,
        ...(headers ? { headers } : {}),
      });

      if (!payload || typeof payload !== 'object') {
        throw new AssistantApiError({
          code: 'AI_PROVIDER_ERROR',
          message: 'Unexpected cart plan validation response',
          retryable: false,
        });
      }

      return toCartPlanValidationResult(payload, channel);
    } catch (error) {
      if (error instanceof MarketplaceApiError) {
        throw mapAssistError(error);
      }
      throw mapAssistError(error);
    }
  }

  /**
   * Phase 21 — report confirm/discard for durable audit. Never mutates cart server-side.
   * Callers should fire-and-forget; UX must not await or surface failures.
   */
  async reportCartPlanDecision(request: {
    readonly decision: 'confirm' | 'discard';
    readonly conversationId?: string;
    readonly planCount?: number;
    readonly authToken?: string | null;
    readonly signal?: AbortSignal;
  }): Promise<void> {
    const channel = resolveChannel();
    const { body, headers } = withCanaryBody({
      mode: 'consumer_ordering',
      channel,
      decision: request.decision,
      ...(request.conversationId ? { conversationId: request.conversationId } : {}),
      ...(typeof request.planCount === 'number' ? { planCount: request.planCount } : {}),
    });
    await this.http.request({
      path: '/api/ai/v1/consumer/cart-plan/decision',
      method: 'POST',
      authToken: request.authToken,
      signal: request.signal,
      body,
      ...(headers ? { headers } : {}),
    });
  }
}

let singleton: AssistantApiClient | null = null;

export function getAssistantApiClient(): AssistantApiClient {
  if (!singleton) singleton = new AssistantApiClient();
  return singleton;
}

export function resetAssistantApiClientForTests(): void {
  singleton = null;
}
