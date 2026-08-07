/**
 * Phase 3 consumer assist contract — narrow, stable, read-only.
 * Clients must not auto-execute suggestedHints or proposedCartActions.
 */

export type ConsumerAssistChannel = 'orderbhojan_web' | 'orderbhojan_android';

export type ConsumerAssistHintType = 'none' | 'navigate' | 'open_url';

export interface ConsumerAssistHint {
  readonly type: ConsumerAssistHintType;
  /** Optional path or URL string — informational only. */
  readonly target?: string;
}

/** Structural cart-plan shape (mirrors CartPlanAction; kept here to avoid import cycles). */
export interface ConsumerAssistCartPlanAction {
  readonly type: 'cart_add_plan' | 'cart_update_plan' | 'cart_remove_plan';
  readonly requiresConfirmation: true;
  readonly executable: false;
  readonly payload?: Readonly<Record<string, unknown>>;
  readonly reason?: string;
}

/** Stable Phase 3 response for OrderBhojan web + Android. */
export interface ConsumerAssistResult {
  readonly schemaVersion: '3.0';
  readonly conversationId: string;
  readonly channel: ConsumerAssistChannel;
  readonly reply: string;
  readonly intent: string;
  readonly safetyBlocked: boolean;
  readonly suggestedHints: readonly ConsumerAssistHint[];
  /**
   * Non-executable cart plans extracted from the gateway payload.
   * Never auto-apply — validate + explicit user confirmation required (Phase 14 UI).
   */
  readonly proposedCartActions: readonly ConsumerAssistCartPlanAction[];
  /**
   * Schedule metadata from voice WorkflowResponseMapper (`set_delivery_schedule`).
   * Applied to checkout deliveryTimeSlot only — not payment.
   */
  readonly proposedScheduleActions?: readonly {
    readonly deliveryType: 'asap' | 'scheduled';
    readonly deliveryTimeSlot?: string;
    readonly slotLabel?: string;
    readonly scheduledFor?: string;
    readonly source: 'voice';
  }[];
  /**
   * Ambiguous / invalid / missing delivery time from voice clarify.
   * Prefer over proposedScheduleActions when present.
   */
  readonly scheduleVoiceFeedback?: {
    readonly kind: 'clarify' | 'error';
    readonly reason: string;
    readonly message: string;
  };
  readonly providerModel?: string;
  readonly sideEffects: [];
  readonly mutatedState: false;
}

export type AssistantErrorCode =
  | 'AI_FEATURE_DISABLED'
  | 'AI_VOICE_DISABLED'
  | 'AI_VOICE_UNSUPPORTED'
  | 'AI_VOICE_PERMISSION_DENIED'
  | 'AI_VOICE_TIMEOUT'
  | 'AI_VOICE_EMPTY'
  | 'AI_VOICE_ABORTED'
  | 'AI_VOICE_ERROR'
  | 'AI_TTS_UNSUPPORTED'
  | 'AI_TTS_EMPTY'
  | 'AI_TTS_ABORTED'
  | 'AI_TTS_ERROR'
  | 'AI_RATE_LIMITED'
  | 'AI_UNAVAILABLE'
  | 'AI_GATEWAY_DISABLED'
  | 'AI_GATEWAY_NOT_CONFIGURED'
  | 'AI_SAFETY_BLOCKED'
  | 'AI_INVALID_REQUEST'
  | 'AI_MODE_FORBIDDEN'
  | 'AI_CANARY_EXCLUDED'
  | 'AI_CANARY_HEALTH_GATE'
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

/** Caller-owned kitchen/menu snapshot for grounded assist (mirrors gateway orderingContext). */
export interface OrderingAssistContext {
  readonly restaurantId?: string;
  readonly restaurantName?: string;
  readonly restaurantSlug?: string;
  readonly areaLabel?: string;
  readonly city?: string;
  readonly menuItems?: readonly {
    readonly id?: string;
    readonly name: string;
    readonly price?: number;
    readonly isVeg?: boolean;
  }[];
  readonly nearbyKitchens?: readonly {
    readonly id?: string;
    readonly name: string;
    readonly cuisine?: string;
  }[];
}

export interface ConsumerAssistRequest {
  readonly message: string;
  readonly conversationId?: string;
  readonly authToken?: string | null;
  readonly signal?: AbortSignal;
  readonly orderingContext?: OrderingAssistContext;
  readonly preferredLanguage?: string;
}

export interface VoiceTranscriptResult {
  readonly transcript: string;
  readonly source: 'web_speech';
  readonly platform: 'web' | 'android' | 'unknown';
}
