/** Shared AI Platform — core mode/channel types (Phase 1+2). */

export const ASSISTANT_MODES = ['consumer_ordering', 'merchant_marketing'] as const;
export type AssistantMode = (typeof ASSISTANT_MODES)[number];

export type AssistantChannel = 'orderbhojan_web' | 'orderbhojan_android' | 'bhojanos_marketing' | 'unknown';

/** Capability labels — no tool execution in Phase 1–2. */
export type AssistantCapability =
  | 'browse_restaurants'
  | 'search_menu'
  | 'recommend_meals'
  | 'explain_checkout'
  | 'post_order_help'
  | 'cart_plan_readonly'
  | 'product_faq'
  | 'onboarding_guidance'
  | 'lead_qualification'
  | 'signup_routing';

export interface AiAssistRequestBody {
  readonly mode?: unknown;
  readonly channel?: unknown;
  readonly message?: unknown;
  readonly conversationId?: unknown;
  readonly context?: unknown;
}

export interface AiAssistRequest {
  readonly mode: AssistantMode;
  readonly channel: AssistantChannel;
  readonly message: string;
  readonly conversationId?: string;
  readonly context?: Record<string, unknown>;
}

export interface AiGatewayDisabledResponse {
  readonly success: false;
  readonly error: string;
  readonly code:
    | 'AI_GATEWAY_DISABLED'
    | 'AI_GATEWAY_NOT_CONFIGURED'
    | 'AI_INVALID_REQUEST'
    | 'AI_MODE_FORBIDDEN'
    | 'AI_PROVIDER_ERROR'
    | 'AI_SAFETY_BLOCKED'
    | 'AI_CANARY_EXCLUDED'
    | 'AI_CANARY_HEALTH_GATE';
  readonly schemaVersion: '2.0';
}
