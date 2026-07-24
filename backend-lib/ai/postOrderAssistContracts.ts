/**
 * Phase 10 — sanitize optional post-order context for /api/ai/v1/assist.
 * Caller-supplied snapshot only; gateway does not fetch orders.
 */

export interface PostOrderSnapshot {
  readonly orderNumber?: string;
  readonly status?: string;
  readonly paymentStatus?: string;
  readonly etaMinutes?: { readonly min: number; readonly max: number };
  readonly lastTimelineMessage?: string;
}

export interface PostOrderAssistContext {
  readonly orderId?: string;
  readonly guestPhone?: string;
  readonly snapshot?: PostOrderSnapshot;
}

function asTrimmedString(value: unknown, maxLen: number): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLen);
}

function parseSnapshot(raw: unknown): PostOrderSnapshot | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const obj = raw as Record<string, unknown>;
  const orderNumber = asTrimmedString(obj.orderNumber, 64);
  const status = asTrimmedString(obj.status, 64);
  const paymentStatus = asTrimmedString(obj.paymentStatus, 64);
  const lastTimelineMessage = asTrimmedString(obj.lastTimelineMessage, 240);

  let etaMinutes: PostOrderSnapshot['etaMinutes'];
  if (obj.etaMinutes && typeof obj.etaMinutes === 'object' && !Array.isArray(obj.etaMinutes)) {
    const eta = obj.etaMinutes as Record<string, unknown>;
    const min = typeof eta.min === 'number' && Number.isFinite(eta.min) ? Math.max(0, Math.round(eta.min)) : undefined;
    const max = typeof eta.max === 'number' && Number.isFinite(eta.max) ? Math.max(0, Math.round(eta.max)) : undefined;
    if (min !== undefined && max !== undefined) {
      etaMinutes = { min: Math.min(min, max), max: Math.max(min, max) };
    }
  }

  if (!orderNumber && !status && !paymentStatus && !etaMinutes && !lastTimelineMessage) {
    return undefined;
  }

  return {
    ...(orderNumber ? { orderNumber } : {}),
    ...(status ? { status } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(etaMinutes ? { etaMinutes } : {}),
    ...(lastTimelineMessage ? { lastTimelineMessage } : {}),
  };
}

/**
 * Parse assist `context` for post-order fields.
 * Accepts either flat context `{ orderId, snapshot }` or nested `{ orderContext: {...} }`.
 */
export function parsePostOrderAssistContext(raw: unknown): {
  readonly used: boolean;
  readonly context: PostOrderAssistContext | null;
} {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { used: false, context: null };
  }

  const root = raw as Record<string, unknown>;
  const nested =
    root.orderContext && typeof root.orderContext === 'object' && !Array.isArray(root.orderContext)
      ? (root.orderContext as Record<string, unknown>)
      : root;

  const orderId = asTrimmedString(nested.orderId, 128);
  const guestPhone = asTrimmedString(nested.guestPhone, 32);
  const snapshot = parseSnapshot(nested.snapshot);

  if (!orderId && !guestPhone && !snapshot) {
    return { used: false, context: null };
  }

  return {
    used: true,
    context: {
      ...(orderId ? { orderId } : {}),
      ...(guestPhone ? { guestPhone } : {}),
      ...(snapshot ? { snapshot } : {}),
    },
  };
}

/** Read-only system prompt addon — never claims order mutations. */
export function buildPostOrderSystemAddon(context: PostOrderAssistContext): string {
  const facts: string[] = [];
  if (context.orderId) facts.push(`orderId=${context.orderId}`);
  if (context.snapshot?.orderNumber) facts.push(`orderNumber=${context.snapshot.orderNumber}`);
  if (context.snapshot?.status) facts.push(`status=${context.snapshot.status}`);
  if (context.snapshot?.paymentStatus) facts.push(`paymentStatus=${context.snapshot.paymentStatus}`);
  if (context.snapshot?.etaMinutes) {
    facts.push(`etaMinutes=${context.snapshot.etaMinutes.min}-${context.snapshot.etaMinutes.max}`);
  }
  if (context.snapshot?.lastTimelineMessage) {
    facts.push(`lastUpdate=${context.snapshot.lastTimelineMessage}`);
  }

  return [
    'Post-order help mode: the user may be asking about an existing order.',
    'Use the provided snapshot facts if present; do not invent order statuses or ETAs.',
    'You MUST NOT cancel, reorder, refund, change address, capture payment, or claim any order mutation.',
    'For cancel_order, refund, or payment_issue intents: triage only — collect order number / payment method / status facts, give non-committal guidance, and escalate to human support.',
    'Never promise that a refund, cancellation, or payment fix will succeed or by when.',
    'If status is CANCELLED and payment was online, you may say refunds typically take 5–7 business days pending bank/UPI processing — always qualify that support must confirm.',
    'Allowed informational hints: navigate /orders, /orders/{orderId}/track, /profile; open_url mailto:support@orderbhojan.com (with order number in subject when known).',
    'Guidance only — the user must tap hints; do not claim you emailed support or cancelled anything.',
    facts.length > 0 ? `Known facts: ${facts.join('; ')}.` : 'No order snapshot was provided — ask clarifying questions (order number, payment method, what went wrong).',
  ].join(' ');
}
