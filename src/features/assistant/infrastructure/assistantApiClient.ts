import { EnvironmentConfig } from '../../../config/environment';
import { resolveMarketingAssistChannel } from '../domain/resolveMarketingAssistChannel';
import { toMarketingHints } from '../domain/readOnlyPolicy';
import {
  AssistantApiError,
  type MarketingAssistChannel,
  type MarketingAssistRequest,
  type MarketingAssistResult,
} from '../types';

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
  readonly meta?: { readonly mutatedState?: boolean };
}

interface GatewayErrorBody {
  readonly error?: string;
  readonly code?: string;
  readonly correlationId?: string;
}

function apiBase(): string {
  return EnvironmentConfig.getApiUrl().replace(/\/$/, '');
}

function mapHttpError(status: number, body: GatewayErrorBody): AssistantApiError {
  const correlationId =
    typeof body.correlationId === 'string' ? body.correlationId : undefined;
  const message = typeof body.error === 'string' ? body.error : undefined;

  if (status === 429 || body.code === 'AI_RATE_LIMITED') {
    return new AssistantApiError({
      code: 'AI_RATE_LIMITED',
      message: message || 'AI rate limit reached. Please wait and try again.',
      retryable: true,
      status: 429,
      correlationId,
    });
  }

  if (status === 503 || body.code === 'AI_GATEWAY_DISABLED') {
    return new AssistantApiError({
      code: 'AI_UNAVAILABLE',
      message: message || 'AI assistant is unavailable.',
      retryable: false,
      status: 503,
      correlationId,
    });
  }

  if (status === 422 || body.code === 'AI_SAFETY_BLOCKED') {
    return new AssistantApiError({
      code: 'AI_SAFETY_BLOCKED',
      message: message || 'Assistant response blocked by safety rules.',
      retryable: false,
      status: 422,
      correlationId,
    });
  }

  if (status === 403 || body.code === 'AI_MODE_FORBIDDEN') {
    return new AssistantApiError({
      code: 'AI_MODE_FORBIDDEN',
      message: message || 'Assistant mode is not allowed for this channel.',
      retryable: false,
      status: 403,
      correlationId,
    });
  }

  return new AssistantApiError({
    code: 'UNKNOWN',
    message: message || `Assistant request failed (${status})`,
    retryable: false,
    status,
    correlationId,
  });
}

function toMarketingResult(
  payload: GatewayAssistSuccess,
  channel: MarketingAssistChannel,
): MarketingAssistResult {
  return {
    schemaVersion: '7.0',
    conversationId: payload.conversationId,
    channel,
    reply: payload.reply,
    intent: payload.intent,
    safetyBlocked: payload.structured?.safety?.blocked === true,
    suggestedHints: toMarketingHints(payload.structured?.proposedActions),
    ...(payload.provider?.model ? { providerModel: payload.provider.model } : {}),
    sideEffects: [],
    mutatedState: false,
  };
}

/**
 * Zero-retry marketing assist client → `/api/ai/v1/assist`.
 * Never executes suggestedHints. Public marketing path (no auth required).
 */
export class AssistantApiClient {
  resolveChannel(): MarketingAssistChannel {
    return resolveMarketingAssistChannel();
  }

  async getStatus(signal?: AbortSignal): Promise<{
    enabled: boolean;
    ready: boolean;
    phase: number;
  }> {
    try {
      const response = await fetch(`${apiBase()}/api/ai/v1/status`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal,
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as GatewayErrorBody;
        throw mapHttpError(response.status, body);
      }
      const payload = (await response.json()) as {
        enabled?: boolean;
        ready?: boolean;
        phase?: number;
      };
      return {
        enabled: payload.enabled === true,
        ready: payload.ready === true,
        phase: typeof payload.phase === 'number' ? payload.phase : 0,
      };
    } catch (error) {
      if (error instanceof AssistantApiError) throw error;
      throw new AssistantApiError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
        retryable: true,
      });
    }
  }

  async marketingAssist(request: MarketingAssistRequest): Promise<MarketingAssistResult> {
    const channel = resolveMarketingAssistChannel();
    const message = request.message.trim();
    if (!message) {
      throw new AssistantApiError({
        code: 'AI_INVALID_REQUEST',
        message: 'message must be a non-empty string',
        retryable: false,
      });
    }

    try {
      const response = await fetch(`${apiBase()}/api/ai/v1/assist`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: request.signal,
        body: JSON.stringify({
          mode: 'merchant_marketing',
          channel,
          message,
          ...(request.conversationId ? { conversationId: request.conversationId } : {}),
        }),
      });

      const payload = (await response.json().catch(() => null)) as
        | GatewayAssistSuccess
        | GatewayErrorBody
        | null;

      if (!response.ok) {
        throw mapHttpError(response.status, (payload as GatewayErrorBody) || {});
      }

      if (!payload || (payload as GatewayAssistSuccess).success !== true) {
        throw new AssistantApiError({
          code: 'AI_PROVIDER_ERROR',
          message: 'Unexpected assistant response',
          retryable: false,
        });
      }

      return toMarketingResult(payload as GatewayAssistSuccess, channel);
    } catch (error) {
      if (error instanceof AssistantApiError) throw error;
      throw new AssistantApiError({
        code: 'NETWORK_ERROR',
        message: error instanceof Error ? error.message : 'Network error',
        retryable: true,
      });
    }
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
