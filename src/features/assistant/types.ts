/**
 * Phase 7 merchant marketing assist contract — narrow, stable, read-only.
 * Clients must not auto-execute suggestedHints (signup/demo/contact/navigation).
 */

export type MarketingAssistChannel = 'bhojanos_marketing';

export type MarketingAssistHintType =
  | 'none'
  | 'navigate'
  | 'open_url'
  | 'suggest_signup'
  | 'suggest_demo'
  | 'suggest_contact';

export interface MarketingAssistHint {
  readonly type: MarketingAssistHintType;
  /** Optional path or URL string — informational only. */
  readonly target?: string;
}

/** Stable Phase 7 response for bhojanos.com marketing. */
export interface MarketingAssistResult {
  readonly schemaVersion: '7.0';
  readonly conversationId: string;
  readonly channel: MarketingAssistChannel;
  readonly reply: string;
  readonly intent: string;
  readonly safetyBlocked: boolean;
  readonly suggestedHints: readonly MarketingAssistHint[];
  readonly providerModel?: string;
  readonly sideEffects: [];
  readonly mutatedState: false;
}

export type AssistantErrorCode =
  | 'AI_FEATURE_DISABLED'
  | 'AI_RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'AI_GATEWAY_DISABLED'
  | 'AI_GATEWAY_NOT_CONFIGURED'
  | 'AI_SAFETY_BLOCKED'
  | 'AI_INVALID_REQUEST'
  | 'AI_MODE_FORBIDDEN'
  | 'AI_PROVIDER_ERROR'
  | 'NETWORK_ERROR'
  | 'UNKNOWN';

export class AssistantApiError extends Error {
  readonly code: AssistantErrorCode;
  readonly retryable: boolean;
  readonly status?: number;
  readonly correlationId?: string;

  constructor(params: {
    code: AssistantErrorCode;
    message: string;
    retryable?: boolean;
    status?: number;
    correlationId?: string;
  }) {
    super(params.message);
    this.name = 'AssistantApiError';
    this.code = params.code;
    this.retryable = params.retryable ?? false;
    this.status = params.status;
    this.correlationId = params.correlationId;
  }
}

export interface MarketingAssistRequest {
  readonly message: string;
  readonly conversationId?: string;
  readonly signal?: AbortSignal;
}
