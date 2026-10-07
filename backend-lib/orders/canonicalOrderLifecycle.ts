/**
 * Phase A / C — Canonical order lifecycle.
 *
 * Single source of truth for order status vocabulary, legacy compatibility
 * mapping, and the authoritative transition table. The Command API is the only
 * writer of these values; legacy clients keep reading their historical fields
 * (`status`, `orderStatus`) which the processor keeps in sync during the
 * deprecation window.
 *
 * Lifecycle, payment status and kitchen fulfilment are deliberately separate
 * concerns: only ORDER_STATUS is modelled here. Payment lives in
 * `backend-lib/paymentGate.ts` and kitchen tickets are separate documents.
 */

/** Canonical lifecycle values written by BhojanOS APIs. */
export const CANONICAL_ORDER_STATUSES = [
  'PLACED',
  'ACCEPTED',
  'REJECTED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;

export type CanonicalOrderStatus = (typeof CANONICAL_ORDER_STATUSES)[number];

/**
 * Legacy spellings observed in Firestore across OrderBhojan, the Owner app and
 * the POS. Values are UPPERCASED and trimmed before lookup.
 *
 * Deprecation path: legacy values keep being read and normalised, but every
 * write emits the canonical value. Removal of an alias requires that no
 * document still stores it (see docs/PHASE-A-COMMAND-API.md).
 */
export const LEGACY_ORDER_STATUS_ALIASES: Readonly<Record<string, CanonicalOrderStatus>> = {
  NEW: 'PLACED',
  CREATED: 'PLACED',
  PENDING: 'PLACED',
  RECEIVED: 'PLACED',
  ORDER_PLACED: 'PLACED',
  ORDER_RECEIVED: 'PLACED',
  CONFIRMED: 'ACCEPTED',
  ORDER_ACCEPTED: 'ACCEPTED',
  IN_KITCHEN: 'PREPARING',
  COOKING: 'PREPARING',
  ORDER_PREPARING: 'PREPARING',
  ORDER_READY: 'READY',
  DISPATCHED: 'OUT_FOR_DELIVERY',
  PICKED_UP: 'OUT_FOR_DELIVERY',
  DELIVERED: 'COMPLETED',
  ORDER_COMPLETED: 'COMPLETED',
  ORDER_CANCELLED: 'CANCELLED',
  ORDER_REJECTED: 'REJECTED',
  ORDER_EXPIRED: 'EXPIRED',
} as const;

/**
 * Authoritative transition table. Anything not listed is rejected with
 * INVALID_TRANSITION. Self-transitions are permitted only when the command
 * does not otherwise change lifecycle (handled by callers), because a
 * self-transition of an already-terminal state is a no-op that would still
 * bump the order version.
 */
export const ORDER_STATUS_TRANSITIONS: Readonly<Record<CanonicalOrderStatus, readonly CanonicalOrderStatus[]>> = {
  PLACED: ['ACCEPTED', 'REJECTED', 'CANCELLED', 'PREPARING', 'EXPIRED'],
  ACCEPTED: ['PREPARING', 'READY', 'REJECTED', 'CANCELLED'],
  REJECTED: [],
  PREPARING: ['READY', 'OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  READY: ['OUT_FOR_DELIVERY', 'COMPLETED', 'CANCELLED'],
  OUT_FOR_DELIVERY: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: [],
} as const;

/** Statuses that must never be moved again, for operator messaging. */
export const TERMINAL_ORDER_STATUSES: readonly CanonicalOrderStatus[] = [
  'REJECTED',
  'COMPLETED',
  'CANCELLED',
  'EXPIRED',
] as const;

export const isTerminalOrderStatus = (status: CanonicalOrderStatus): boolean =>
  TERMINAL_ORDER_STATUSES.includes(status);

export const isCanonicalOrderStatus = (value: unknown): value is CanonicalOrderStatus =>
  typeof value === 'string' && (CANONICAL_ORDER_STATUSES as readonly string[]).includes(value);

/**
 * Resolve any stored/legacy status to its canonical value.
 * Unknown or missing values resolve to `null` so callers must decide a default
 * rather than silently inventing one.
 */
export const normalizeOrderStatus = (value: unknown): CanonicalOrderStatus | null => {
  if (value === null || value === undefined) return null;
  const raw = String(value).trim().toUpperCase();
  if (!raw) return null;
  if (isCanonicalOrderStatus(raw)) return raw;
  return LEGACY_ORDER_STATUS_ALIASES[raw] ?? null;
};

/**
 * Status used when an order document carries no lifecycle field at all. Chosen
 * to match the checkout write path, which always stores `PLACED`.
 */
export const DEFAULT_ORDER_STATUS: CanonicalOrderStatus = 'PLACED';

/**
 * Resolve a stored status, applying the documented default. `strict` returns
 * null for unknown values so callers can reject the document instead.
 */
export const resolveOrderStatus = (value: unknown, strict = false): CanonicalOrderStatus | null => {
  const normalized = normalizeOrderStatus(value);
  if (normalized) return normalized;
  if (strict) return null;
  return value === null || value === undefined || String(value).trim() === ''
    ? DEFAULT_ORDER_STATUS
    : null;
};

export interface TransitionDecision {
  allowed: boolean;
  from: CanonicalOrderStatus;
  to: CanonicalOrderStatus | null;
  code?: 'INVALID_STATUS_VALUE' | 'INVALID_TRANSITION' | 'TERMINAL_ORDER';
  message?: string;
}

/**
 * Authoritative transition validation. Callers run this before writing.
 * A no-op (from === to) is reported as allowed with `noop: true` so the
 * caller can skip the write and version bump.
 */
export const evaluateOrderTransition = (
  currentValue: unknown,
  requestedValue: unknown
): TransitionDecision & { noop: boolean } => {
  const from = resolveOrderStatus(currentValue, true);
  if (!from) {
    return {
      allowed: false,
      noop: false,
      from: DEFAULT_ORDER_STATUS,
      to: null,
      code: 'INVALID_STATUS_VALUE',
      message: `Stored order status '${String(currentValue)}' is not a recognised lifecycle value.`,
    };
  }

  const to = resolveOrderStatus(requestedValue, true);
  if (!to) {
    return {
      allowed: false,
      noop: false,
      from,
      to: null,
      code: 'INVALID_STATUS_VALUE',
      message: `Requested order status '${String(requestedValue)}' is not a recognised lifecycle value.`,
    };
  }

  if (from === to) {
    return { allowed: true, noop: true, from, to };
  }

  if (isTerminalOrderStatus(from)) {
    return {
      allowed: false,
      noop: false,
      from,
      to,
      code: 'TERMINAL_ORDER',
      message: `Order is in terminal status '${from}' and cannot move to '${to}'.`,
    };
  }

  if (!(ORDER_STATUS_TRANSITIONS[from] ?? []).includes(to)) {
    return {
      allowed: false,
      noop: false,
      from,
      to,
      code: 'INVALID_TRANSITION',
      message: `Cannot transition order from '${from}' to '${to}'.`,
    };
  }

  return { allowed: true, noop: false, from, to };
};

/**
 * Lifecycle values a client command may not set directly.
 *
 * Dispatch and expiry are owned by fulfilment/courier workflows and the
 * auto-expiry worker respectively. `COMPLETED` is intentionally *not* here:
 * finishing an order at the counter is a legitimate POS action, it is reached
 * through `UpdateOrderStatus` and is still subject to the payment gate.
 */
export const SERVER_ONLY_STATUSES: readonly CanonicalOrderStatus[] = [
  'OUT_FOR_DELIVERY',
  'EXPIRED',
] as const;

/**
 * Domain event type emitted to the outbox for a committed lifecycle change.
 * Deterministic so replaying a command produces the same event name.
 */
export const orderStatusEventType = (status: CanonicalOrderStatus): string => {
  switch (status) {
    case 'ACCEPTED':
      return 'order.accepted';
    case 'REJECTED':
      return 'order.rejected';
    case 'PREPARING':
      return 'order.preparing';
    case 'READY':
      return 'order.ready';
    case 'OUT_FOR_DELIVERY':
      return 'order.dispatched';
    case 'COMPLETED':
      return 'order.completed';
    case 'CANCELLED':
      return 'order.cancelled';
    case 'EXPIRED':
      return 'order.expired';
    default:
      return 'order.placed';
  }
};