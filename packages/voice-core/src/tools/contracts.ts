/**
 * Typed tool contracts for the shared voice platform.
 * Critical actions require tool-only truth + explicit confirmation.
 */

export type VoiceToolName =
  | 'findKitchens'
  | 'findMenuItems'
  | 'getMenuItemDetails'
  | 'getOrCreateCart'
  | 'addItemToCart'
  | 'removeItemFromCart'
  | 'getCartSummary'
  | 'confirmPendingChange'
  | 'discardPendingChange'
  | 'validateDeliveryAddress'
  | 'placeOrder'
  | 'getOrderStatus'
  | 'escalateToHuman'
  | 'getKitchenAvailability'
  | 'createPhoneOrder';

export type VoiceToolCall<N extends VoiceToolName = VoiceToolName> = {
  readonly tool: N;
  readonly callId: string;
  readonly args: Record<string, unknown>;
};

export type VoiceToolSuccess<T = unknown> = {
  readonly ok: true;
  readonly tool: VoiceToolName;
  readonly callId: string;
  readonly data: T;
};

export type VoiceToolFailure = {
  readonly ok: false;
  readonly tool: VoiceToolName;
  readonly callId: string;
  readonly code:
    | 'NOT_SUPPORTED'
    | 'NEEDS_CONFIRMATION'
    | 'NEEDS_CLARIFICATION'
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'INVALID_ARGS'
    | 'UPSTREAM_ERROR'
    | 'IDEMPOTENT_REPLAY';
  readonly message: string;
};

export type VoiceToolResult<T = unknown> = VoiceToolSuccess<T> | VoiceToolFailure;

export type FindMenuItemsArgs = {
  readonly kitchenId?: string;
  readonly kitchenHint?: string;
  readonly query: string;
  readonly filters?: { readonly vegOnly?: boolean };
};

export type AddItemToCartArgs = {
  readonly kitchenId?: string;
  readonly kitchenHint?: string;
  readonly itemId?: string;
  readonly itemName: string;
  readonly quantity: number;
  readonly modifiers?: readonly string[];
};

export type GetCartSummaryArgs = {
  readonly cartId?: string;
  readonly kitchenId?: string;
};

export type PlaceOrderArgs = {
  readonly cartId: string;
  readonly addressId?: string;
  readonly paymentMode?: string;
  /** Must be true — voice platform never places without explicit confirm. */
  readonly userConfirmed: boolean;
};

export type EscalateArgs = {
  readonly reason: string;
  readonly context?: Record<string, unknown>;
};

/** Tools that mutate cart/order state and must go through confirmation. */
export const MUTATING_VOICE_TOOLS: readonly VoiceToolName[] = [
  'addItemToCart',
  'removeItemFromCart',
  'confirmPendingChange',
  'placeOrder',
  'createPhoneOrder',
] as const;

export function isMutatingVoiceTool(tool: VoiceToolName): boolean {
  return (MUTATING_VOICE_TOOLS as readonly string[]).includes(tool);
}

export function createToolCallId(): string {
  return `tc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * placeOrder is intentionally blocked in Phase 1 — checkout UI owns payment.
 * Voice may only guide the user after explicit confirmation of cart contents.
 */
export function blockPlaceOrderWithoutConfirm(
  args: PlaceOrderArgs,
): VoiceToolFailure | null {
  if (args.userConfirmed !== true) {
    return {
      ok: false,
      tool: 'placeOrder',
      callId: createToolCallId(),
      code: 'NEEDS_CONFIRMATION',
      message: 'Order placement requires explicit user confirmation.',
    };
  }
  return {
    ok: false,
    tool: 'placeOrder',
    callId: createToolCallId(),
    code: 'NOT_SUPPORTED',
    message: 'Voice cannot place orders yet. Open checkout to pay and confirm.',
  };
}
