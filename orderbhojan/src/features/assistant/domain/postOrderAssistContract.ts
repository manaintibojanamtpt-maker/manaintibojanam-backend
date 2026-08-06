import type { ConsumerAssistChannel, ConsumerAssistHint } from '../types';

/**
 * Phase 10 post-order assist contract — read-only guidance.
 * Clients must not auto-execute suggestedHints or fetch orders inside this module.
 */

export interface PostOrderSnapshot {
  readonly orderNumber?: string;
  readonly status?: string;
  readonly paymentStatus?: string;
  readonly etaMinutes?: { readonly min: number; readonly max: number };
  readonly lastTimelineMessage?: string;
}

export interface PostOrderContext {
  readonly orderId?: string;
  readonly guestPhone?: string;
  /** Caller-supplied read snapshot — never fetched by assistant module. */
  readonly snapshot?: PostOrderSnapshot;
}

export interface PostOrderAssistRequest {
  readonly message: string;
  readonly conversationId?: string;
  readonly orderContext?: PostOrderContext;
  readonly authToken?: string | null;
  readonly preferredLanguage?: string;
  readonly signal?: AbortSignal;
}

export interface PostOrderAssistResult {
  readonly schemaVersion: '10.0';
  readonly conversationId: string;
  readonly channel: ConsumerAssistChannel;
  readonly reply: string;
  readonly intent: string;
  readonly orderContextUsed: boolean;
  readonly safetyBlocked: boolean;
  readonly suggestedHints: readonly ConsumerAssistHint[];
  readonly providerModel?: string;
  readonly sideEffects: [];
  readonly mutatedState: false;
}

/** Build optional context blob from caller-owned order DTOs (no network). */
export function buildPostOrderContext(params: {
  readonly orderId?: string;
  readonly guestPhone?: string;
  readonly snapshot?: PostOrderSnapshot;
}): PostOrderContext | undefined {
  const orderId = params.orderId?.trim();
  const guestPhone = params.guestPhone?.trim();
  const snapshot = params.snapshot;
  if (!orderId && !guestPhone && !snapshot) return undefined;
  return {
    ...(orderId ? { orderId } : {}),
    ...(guestPhone ? { guestPhone } : {}),
    ...(snapshot ? { snapshot } : {}),
  };
}
