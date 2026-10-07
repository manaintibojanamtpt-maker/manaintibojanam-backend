/**
 * Phase A / C — Order Command API contract.
 *
 * Validated, discriminated command envelope shared by the Owner app, the
 * offline POS and OrderBhojan. Every consumer sends the same shape so the
 * server can validate, authorise, version and acknowledge uniformly.
 *
 * Nothing in this module performs I/O; it is pure so it can be unit tested and
 * reused by the server route and by client-side pre-flight validation.
 */

import {
  CANONICAL_ORDER_STATUSES,
  SERVER_ONLY_STATUSES,
  normalizeOrderStatus,
  type CanonicalOrderStatus,
} from './canonicalOrderLifecycle';

// ---------------------------------------------------------------------------
// Roles
// ---------------------------------------------------------------------------

export type CommandActorRole = 'owner' | 'manager' | 'cashier' | 'kitchen' | 'admin' | 'system';

/**
 * Roles a POS/Owner client may present. Resolved from verified authentication
 * only — never from the request body.
 */
export const STAFF_COMMAND_ROLES: readonly CommandActorRole[] = [
  'owner',
  'manager',
  'cashier',
  'kitchen',
] as const;

export const isStaffCommandRole = (role: CommandActorRole): boolean =>
  STAFF_COMMAND_ROLES.includes(role);

// ---------------------------------------------------------------------------
// Command types
// ---------------------------------------------------------------------------

export const ORDER_COMMAND_TYPES = [
  'CreateOrder',
  'AcceptOrder',
  'RejectOrder',
  'MarkPreparing',
  'MarkReady',
  'UpdateOrderStatus',
  'RecordPayment',
  'CreateKot',
] as const;

export type OrderCommandType = (typeof ORDER_COMMAND_TYPES)[number];

export const isOrderCommandType = (value: unknown): value is OrderCommandType =>
  typeof value === 'string' && (ORDER_COMMAND_TYPES as readonly string[]).includes(value);

/**
 * Per-command role authorisation. `null` in a role list means "any staff role".
 * Customers are never authorised for any order Command API verb.
 */
const COMMAND_ALLOWED_ROLES: Readonly<Record<OrderCommandType, readonly CommandActorRole[]>> = {
  /**
   * Order creation is a POS counter action. A kitchen-only account cannot open a
   * bill, so it is not in this list.
   */
  CreateOrder: ['owner', 'manager', 'cashier', 'admin'],
  AcceptOrder: ['owner', 'manager', 'cashier', 'kitchen', 'admin'],
  RejectOrder: ['owner', 'manager', 'kitchen', 'admin'],
  MarkPreparing: ['owner', 'manager', 'kitchen', 'admin'],
  MarkReady: ['owner', 'manager', 'kitchen', 'admin'],
  UpdateOrderStatus: ['owner', 'manager', 'cashier', 'kitchen', 'admin'],
  RecordPayment: ['owner', 'manager', 'cashier', 'admin'],
  CreateKot: ['owner', 'manager', 'kitchen', 'admin'],
} as const;

export const allowedRolesForCommand = (type: OrderCommandType): readonly CommandActorRole[] =>
  COMMAND_ALLOWED_ROLES[type];

export const isRoleAllowedForCommand = (type: OrderCommandType, role: CommandActorRole): boolean =>
  COMMAND_ALLOWED_ROLES[type].includes(role);

// ---------------------------------------------------------------------------
// Payment methods
// ---------------------------------------------------------------------------

/**
 * Payment methods a staff member can record by hand. These represent an
 * out-of-band collection that a human observed.
 */
export const STAFF_RECORDED_PAYMENT_METHODS = ['CASH', 'CARD', 'UPI_MANUAL', 'CHEQUE', 'BANK_TRANSFER'] as const;
export type StaffRecordedPaymentMethod = (typeof STAFF_RECORDED_PAYMENT_METHODS)[number];

/**
 * Methods settled by an online gateway. Their success may only be declared by
 * a verified provider webhook, never by a client command.
 */
export const PROVIDER_VERIFIED_PAYMENT_METHODS = [
  'RAZORPAY',
  'ONLINE',
  'UPI_GATEWAY',
  'CARD_GATEWAY',
  'NETBANKING',
  'WALLET',
] as const;
export type ProviderVerifiedPaymentMethod = (typeof PROVIDER_VERIFIED_PAYMENT_METHODS)[number];

/** Legacy client spellings mapped onto the canonical method vocabulary. */
const PAYMENT_METHOD_ALIASES: Readonly<Record<string, string>> = {
  COD: 'CASH_ON_DELIVERY',
  CASH_ON_DELIVERY: 'CASH_ON_DELIVERY',
  CASH: 'CASH',
  CARD: 'CARD',
  UPI: 'UPI_MANUAL',
  UPI_MANUAL: 'UPI_MANUAL',
  QR: 'UPI_MANUAL',
  CHEQUE: 'CHEQUE',
  BANK_TRANSFER: 'BANK_TRANSFER',
  NEFT: 'BANK_TRANSFER',
  IMPS: 'BANK_TRANSFER',
  RAZORPAY: 'RAZORPAY',
  ONLINE: 'ONLINE',
  UPI_GATEWAY: 'UPI_GATEWAY',
  CARD_GATEWAY: 'CARD_GATEWAY',
  NETBANKING: 'NETBANKING',
  WALLET: 'WALLET',
};

export type CanonicalPaymentMethod = string;

export const normalizePaymentMethod = (value: unknown): CanonicalPaymentMethod => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return 'UNKNOWN';
  return PAYMENT_METHOD_ALIASES[raw] ?? raw;
};

export const isProviderVerifiedPaymentMethod = (value: unknown): boolean =>
  (PROVIDER_VERIFIED_PAYMENT_METHODS as readonly string[]).includes(
    normalizePaymentMethod(value)
  );

export const isStaffRecordedPaymentMethod = (value: unknown): boolean =>
  (STAFF_RECORDED_PAYMENT_METHODS as readonly string[]).includes(
    normalizePaymentMethod(value)
  );

/**
 * Payment statuses are distinct from order lifecycle. Only these values may be
 * written to `paymentStatus`.
 */
export const CANONICAL_PAYMENT_STATUSES = [
  'PENDING',
  'RECORDED',
  'VERIFIED',
  'FAILED',
  'REFUNDED',
  'EXPIRED',
] as const;

export type CanonicalPaymentStatus = (typeof CANONICAL_PAYMENT_STATUSES)[number];

const PAYMENT_STATUS_ALIASES: Readonly<Record<string, CanonicalPaymentStatus>> = {
  PENDING: 'PENDING',
  PENDING_VERIFICATION: 'PENDING',
  UNPAID: 'PENDING',
  CREATED: 'PENDING',
  PAID: 'RECORDED',
  RECORDED: 'RECORDED',
  SUCCESS: 'VERIFIED',
  VERIFIED: 'VERIFIED',
  CAPTURED: 'VERIFIED',
  FAILED: 'FAILED',
  ERROR: 'FAILED',
  REFUNDED: 'REFUNDED',
  REFUND: 'REFUNDED',
  EXPIRED: 'EXPIRED',
};

export const normalizePaymentStatus = (value: unknown): CanonicalPaymentStatus | null => {
  const raw = String(value ?? '').trim().toUpperCase();
  if (!raw) return null;
  return PAYMENT_STATUS_ALIASES[raw] ?? null;
};

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export const ORDER_COMMAND_ERROR_CODES = [
  'MISSING_IDEMPOTENCY_KEY',
  'INVALID_IDEMPOTENCY_KEY',
  'IDEMPOTENCY_KEY_CONFLICT',
  'UNAUTHENTICATED',
  'FORBIDDEN_TENANT',
  'FORBIDDEN_ROLE',
  'INVALID_ENVELOPE',
  'UNSUPPORTED_COMMAND',
  'INVALID_PAYLOAD',
  'INVALID_ORDER_ITEMS',
  'ORDER_NOT_FOUND',
  'ORDER_ALREADY_EXISTS',
  'TENANT_MISMATCH',
  'CONCURRENCY_CONFLICT',
  'INVALID_STATUS_VALUE',
  'INVALID_TRANSITION',
  'TERMINAL_ORDER',
  'SERVER_ONLY_STATUS',
  'PAYMENT_STATUS_NOT_WRITABLE',
  'PROVIDER_VERIFIED_PAYMENT_REQUIRED',
  'PAYMENT_NOT_VERIFIED',
  'PAYMENT_ALREADY_SETTLED',
  'PAYMENT_AMOUNT_MISMATCH',
  'INTERNAL_ERROR',
] as const;

export type OrderCommandErrorCode = (typeof ORDER_COMMAND_ERROR_CODES)[number];

const ERROR_STATUS: Readonly<Record<OrderCommandErrorCode, number>> = {
  MISSING_IDEMPOTENCY_KEY: 400,
  INVALID_IDEMPOTENCY_KEY: 400,
  IDEMPOTENCY_KEY_CONFLICT: 409,
  UNAUTHENTICATED: 401,
  FORBIDDEN_TENANT: 403,
  FORBIDDEN_ROLE: 403,
  INVALID_ENVELOPE: 400,
  UNSUPPORTED_COMMAND: 400,
  INVALID_PAYLOAD: 422,
  INVALID_ORDER_ITEMS: 422,
  ORDER_NOT_FOUND: 404,
  ORDER_ALREADY_EXISTS: 409,
  TENANT_MISMATCH: 403,
  CONCURRENCY_CONFLICT: 409,
  INVALID_STATUS_VALUE: 422,
  INVALID_TRANSITION: 422,
  TERMINAL_ORDER: 422,
  SERVER_ONLY_STATUS: 422,
  PAYMENT_STATUS_NOT_WRITABLE: 422,
  PROVIDER_VERIFIED_PAYMENT_REQUIRED: 422,
  PAYMENT_NOT_VERIFIED: 422,
  PAYMENT_ALREADY_SETTLED: 409,
  PAYMENT_AMOUNT_MISMATCH: 422,
  INTERNAL_ERROR: 500,
};

export const httpStatusForCommandError = (code: OrderCommandErrorCode): number =>
  ERROR_STATUS[code] ?? 400;

/**
 * Machine-readable error classification so the offline POS can decide between
 * retrying, prompting for re-authentication, or surfacing a permanent failure.
 */
export const COMMAND_ERROR_RETRYABILITY: Readonly<
  Record<OrderCommandErrorCode, 'retryable' | 'auth' | 'permanent'>
> = {
  MISSING_IDEMPOTENCY_KEY: 'permanent',
  INVALID_IDEMPOTENCY_KEY: 'permanent',
  IDEMPOTENCY_KEY_CONFLICT: 'permanent',
  UNAUTHENTICATED: 'auth',
  FORBIDDEN_TENANT: 'permanent',
  FORBIDDEN_ROLE: 'permanent',
  INVALID_ENVELOPE: 'permanent',
  UNSUPPORTED_COMMAND: 'permanent',
  INVALID_PAYLOAD: 'permanent',
  INVALID_ORDER_ITEMS: 'permanent',
  ORDER_NOT_FOUND: 'permanent',
  ORDER_ALREADY_EXISTS: 'permanent',
  TENANT_MISMATCH: 'permanent',
  CONCURRENCY_CONFLICT: 'retryable',
  INVALID_STATUS_VALUE: 'permanent',
  INVALID_TRANSITION: 'permanent',
  TERMINAL_ORDER: 'permanent',
  SERVER_ONLY_STATUS: 'permanent',
  PAYMENT_STATUS_NOT_WRITABLE: 'permanent',
  PROVIDER_VERIFIED_PAYMENT_REQUIRED: 'permanent',
  PAYMENT_NOT_VERIFIED: 'permanent',
  PAYMENT_ALREADY_SETTLED: 'permanent',
  PAYMENT_AMOUNT_MISMATCH: 'permanent',
  INTERNAL_ERROR: 'retryable',
};

// ---------------------------------------------------------------------------
// Envelope
// ---------------------------------------------------------------------------

export interface OrderCommandEnvelope {
  commandId: string;
  type: OrderCommandType;
  tenantId: string;
  orderId: string;
  /** Stable per-install identifier, used for traceability and de-duplication. */
  deviceId?: string;
  /** Monotonic per-device counter; helps order queued commands. */
  clientSequence?: number;
  /** Client wall clock at enqueue time. Advisory only — never authoritative. */
  clientTime?: string;
  /** Optimistic concurrency precondition against `orders/{orderId}.version`. */
  expectedVersion?: number;
  /**
   * Server-assigned trace identifier. Populated by the route from
   * `X-Correlation-Id` or generated. Excluded from the idempotency fingerprint
   * because it is trace metadata, not semantic content.
   */
  correlationId?: string;
  payload: Record<string, unknown>;
}

export interface CommandActor {
  uid: string;
  role: CommandActorRole;
  tenantIds: string[];
  email?: string;
}

export interface ValidatedCommand {
  ok: true;
  envelope: OrderCommandEnvelope;
}

export interface InvalidCommand {
  ok: false;
  code: OrderCommandErrorCode;
  message: string;
  field?: string;
}

export type CommandValidationResult = ValidatedCommand | InvalidCommand;

const IDEMPOTENCY_KEY_MIN = 16;
const IDEMPOTENCY_KEY_MAX = 128;

export const isValidIdempotencyKey = (value: unknown): value is string => {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  return trimmed.length >= IDEMPOTENCY_KEY_MIN && trimmed.length <= IDEMPOTENCY_KEY_MAX;
};

const isNonEmptyString = (value: unknown, max = 256): value is string =>
  typeof value === 'string' && value.trim().length > 0 && value.length <= max;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Reject `__proto__`, `constructor` and `prototype` keys so a hostile payload
 * cannot reach Firestore field paths or prototype chains.
 */
export const hasUnsafeKeys = (value: Record<string, unknown>): boolean =>
  Object.keys(value).some((key) => key === '__proto__' || key === 'constructor' || key === 'prototype');

export interface PayloadValidationContext {
  order: Record<string, unknown>;
  /**
   * Authoritative menu prices keyed by menu item id, read inside the command
   * transaction. When a price is present it overrides whatever the client sent,
   * so an offline POS cannot bill a customer at a price the tenant never
   * published. An item with no menu document keeps the client price and marks
   * the resulting order `pricingSource: 'client_unverified'`.
   */
  menuPrices?: Record<string, number>;
}

// ---------------------------------------------------------------------------
// CreateOrder
// ---------------------------------------------------------------------------

/** Hard ceilings so a malformed or hostile command cannot mint a giant order. */
export const MAX_CREATE_ORDER_ITEMS = 100;
export const MAX_CREATE_ORDER_SUBTOTAL = 1_000_000;

/**
 * Declared as a type alias rather than an interface so it keeps an implicit
 * index signature and can flow through `validateCommandPayload`, whose success
 * arm is typed as `Record<string, unknown>`.
 */
export type NormalizedCreateOrderItem = {
  itemId: string;
  name: string;
  /** Price actually applied, after menu clamping. */
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  /** True when the tenant's published menu priced this line. */
  pricedFromMenu: boolean;
  notes?: string;
};

export type NormalizedCreateOrderPayload = {
  items: NormalizedCreateOrderItem[];
  customer: { name: string; phone: string; address?: string; tableNo?: string };
  orderType: 'DINE_IN' | 'PICKUP' | 'DELIVERY';
  paymentMethod: CanonicalPaymentMethod;
  orderNumber?: number;
  discountPercent: number;
  gstPercent: number;
  pricing: {
    subtotal: number;
    discount: number;
    taxes: number;
    total: number;
    pricingSource: 'menu' | 'client_unverified';
  };
  requestedOrderStatus: CanonicalOrderStatus;
};

const round2 = (value: number): number => Math.round(value * 100) / 100;

const CREATE_ORDER_TYPES: readonly string[] = ['DINE_IN', 'PICKUP', 'DELIVERY'];

/**
 * Validate a `CreateOrder` payload and recompute every monetary total.
 *
 * The client may describe *what* was sold; it may never state what it cost. All
 * money fields in the returned payload are derived here, which is what keeps an
 * offline terminal from deciding an order's value.
 */
export const validateCreateOrderPayload = (
  rawPayload: unknown,
  ctx: PayloadValidationContext
): { ok: true; payload: NormalizedCreateOrderPayload } | InvalidCommand => {
  if (!isPlainObject(rawPayload)) {
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'payload must be an object.', field: 'payload' };
  }
  if (hasUnsafeKeys(rawPayload)) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: 'payload contains reserved keys.',
      field: 'payload',
    };
  }

  const rawItems = rawPayload.items;
  if (!Array.isArray(rawItems) || rawItems.length === 0) {
    return {
      ok: false,
      code: 'INVALID_ORDER_ITEMS',
      message: 'CreateOrder requires payload.items with at least one item.',
      field: 'payload.items',
    };
  }
  if (rawItems.length > MAX_CREATE_ORDER_ITEMS) {
    return {
      ok: false,
      code: 'INVALID_ORDER_ITEMS',
      message: `CreateOrder accepts at most ${MAX_CREATE_ORDER_ITEMS} items per order (received ${rawItems.length}).`,
      field: 'payload.items',
    };
  }

  const menuPrices = ctx.menuPrices ?? {};
  const items: NormalizedCreateOrderItem[] = [];
  let subtotal = 0;

  for (const [index, raw] of rawItems.entries()) {
    if (!isPlainObject(raw)) {
      return {
        ok: false,
        code: 'INVALID_ORDER_ITEMS',
        message: `payload.items[${index}] must be an object.`,
        field: `payload.items[${index}]`,
      };
    }
    const itemId = String(raw.itemId ?? raw.menuItemId ?? '').trim();
    if (!itemId || itemId.length > 128) {
      return {
        ok: false,
        code: 'INVALID_ORDER_ITEMS',
        message: `payload.items[${index}].itemId is required and must be at most 128 characters.`,
        field: `payload.items[${index}].itemId`,
      };
    }

    const quantityRaw = raw.quantity;
    const quantity = Number(quantityRaw);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > 999) {
      return {
        ok: false,
        code: 'INVALID_ORDER_ITEMS',
        message: `payload.items[${index}].quantity must be an integer between 1 and 999.`,
        field: `payload.items[${index}].quantity`,
      };
    }

    const menuPrice = menuPrices[itemId];
    const hasMenuPrice = typeof menuPrice === 'number' && Number.isFinite(menuPrice) && menuPrice > 0;
    const clientPrice = Number(raw.unitPrice ?? raw.price ?? NaN);
    // A published menu price always wins. Only fall back to the client's figure
    // when the tenant has no menu document for this item.
    const unitPrice = round2(hasMenuPrice ? (menuPrice as number) : clientPrice);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      return {
        ok: false,
        code: 'INVALID_ORDER_ITEMS',
        message: `payload.items[${index}] has no usable price. The tenant has no published price for '${itemId}', and the command did not send one.`,
        field: `payload.items[${index}].unitPrice`,
      };
    }

    const lineTotal = round2(unitPrice * quantity);
    subtotal = round2(subtotal + lineTotal);
    if (subtotal > MAX_CREATE_ORDER_SUBTOTAL) {
      return {
        ok: false,
        code: 'INVALID_ORDER_ITEMS',
        message: `Order subtotal ${subtotal} exceeds the maximum allowed ${MAX_CREATE_ORDER_SUBTOTAL}.`,
        field: 'payload.items',
      };
    }

    items.push({
      itemId,
      name: String(raw.name ?? itemId).trim().slice(0, 200) || itemId,
      unitPrice,
      quantity,
      lineTotal,
      pricedFromMenu: Boolean(hasMenuPrice),
      ...(raw.notes ? { notes: String(raw.notes).slice(0, 300) } : {}),
    });
  }

  const rawCustomer = isPlainObject(rawPayload.customer) ? rawPayload.customer : {};
  const customerName = String(rawCustomer.name ?? rawPayload.customerName ?? '').trim().slice(0, 200);
  if (!customerName) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: 'CreateOrder requires customer.name.',
      field: 'payload.customer.name',
    };
  }

  const rawOrderType = String(rawPayload.orderType ?? 'DINE_IN').trim().toUpperCase();
  if (!CREATE_ORDER_TYPES.includes(rawOrderType)) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: `payload.orderType must be one of: ${CREATE_ORDER_TYPES.join(', ')}.`,
      field: 'payload.orderType',
    };
  }

  const method = normalizePaymentMethod(rawPayload.paymentMethod ?? 'CASH');
  if (!isStaffRecordedPaymentMethod(method)) {
    return {
      ok: false,
      code: 'PROVIDER_VERIFIED_PAYMENT_REQUIRED',
      message: `A POS-created order may only be opened with a staff-collected method (${STAFF_RECORDED_PAYMENT_METHODS.join(', ')}). '${method}' is settled by the payment gateway and cannot start an order.`,
      field: 'payload.paymentMethod',
    };
  }

  const readPercent = (value: unknown, field: string): number => {
    if (value === undefined || value === null || value === '') return 0;
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 100) {
      throw new RangeError(field);
    }
    return parsed;
  };
  let discountPercent = 0;
  let gstPercent = 0;
  try {
    discountPercent = readPercent(rawPayload.discountPercent, 'payload.discountPercent');
    gstPercent = readPercent(rawPayload.gstPercent, 'payload.gstPercent');
  } catch {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: 'payload.discountPercent and payload.gstPercent must be numbers between 0 and 100.',
      field: 'payload.discountPercent',
    };
  }

  const requestedStatus = String(rawPayload.orderStatus ?? 'PLACED').trim().toUpperCase();
  const normalizedStatus = normalizeOrderStatus(requestedStatus);
  if (!normalizedStatus || normalizedStatus !== 'PLACED') {
    return {
      ok: false,
      code: 'INVALID_STATUS_VALUE',
      message:
        'CreateOrder always creates an order in PLACED. Use AcceptOrder or UpdateOrderStatus to move it afterwards.',
      field: 'payload.orderStatus',
    };
  }

  const rawOrderNumber = rawPayload.orderNumber;
  let orderNumber: number | undefined;
  if (rawOrderNumber !== undefined && rawOrderNumber !== null && rawOrderNumber !== '') {
    const parsed = Number(rawOrderNumber);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return {
        ok: false,
        code: 'INVALID_PAYLOAD',
        message: 'payload.orderNumber must be a non-negative number when provided.',
        field: 'payload.orderNumber',
      };
    }
    orderNumber = Math.trunc(parsed);
  }

  // All money below is derived on the server; no client total is ever trusted.
  const discount = round2(Math.min(subtotal, Math.max(0, (subtotal * discountPercent) / 100)));
  const taxable = round2(subtotal - discount);
  const taxes = round2((taxable * gstPercent) / 100);
  const total = round2(Math.max(0, taxable + taxes));

  return {
    ok: true,
    payload: {
      items,
      customer: {
        name: customerName,
        phone: String(rawCustomer.phone ?? rawPayload.phone ?? '').trim().slice(0, 32),
        ...(rawCustomer.address ?? rawPayload.address
          ? { address: String(rawCustomer.address ?? rawPayload.address).trim().slice(0, 400) }
          : {}),
        ...(rawCustomer.tableNo ? { tableNo: String(rawCustomer.tableNo).trim().slice(0, 32) } : {}),
      },
      orderType: rawOrderType as NormalizedCreateOrderPayload['orderType'],
      paymentMethod: method,
      ...(orderNumber !== undefined ? { orderNumber } : {}),
      discountPercent,
      gstPercent,
      pricing: {
        subtotal,
        discount,
        taxes,
        total,
        pricingSource: items.every((item) => item.pricedFromMenu) ? 'menu' : 'client_unverified',
      },
      requestedOrderStatus: 'PLACED',
    },
  };
};

/**
 * Validate the `payload` for a command type against the current order.
 * Returns the normalised payload the processor should apply.
 */
export const validateCommandPayload = (
  type: OrderCommandType,
  rawPayload: unknown,
  ctx: PayloadValidationContext
): { ok: true; payload: Record<string, unknown> } | InvalidCommand => {
  if (!isPlainObject(rawPayload)) {
    return { ok: false, code: 'INVALID_PAYLOAD', message: 'payload must be an object.', field: 'payload' };
  }
  if (hasUnsafeKeys(rawPayload)) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      message: 'payload contains reserved keys.',
      field: 'payload',
    };
  }

  switch (type) {
    case 'CreateOrder':
      return validateCreateOrderPayload(rawPayload, ctx);

    case 'AcceptOrder':
      return { ok: true, payload: {} };

    case 'RejectOrder': {
      const reason = rawPayload.rejectionReason ?? rawPayload.reason;
      if (!isNonEmptyString(reason, 500)) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'RejectOrder requires a non-empty rejectionReason.',
          field: 'payload.rejectionReason',
        };
      }
      return { ok: true, payload: { rejectionReason: String(reason).trim() } };
    }

    case 'MarkPreparing':
    case 'MarkReady':
      return { ok: true, payload: {} };

    case 'UpdateOrderStatus': {
      const requested = rawPayload.orderStatus ?? rawPayload.status;
      if (requested === undefined || requested === null || String(requested).trim() === '') {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'UpdateOrderStatus requires payload.orderStatus.',
          field: 'payload.orderStatus',
        };
      }
      if (rawPayload.paymentStatus !== undefined) {
        return {
          ok: false,
          code: 'PAYMENT_STATUS_NOT_WRITABLE',
          message:
            'UpdateOrderStatus cannot change paymentStatus. Use RecordPayment for staff-recorded payments; gateway payments are confirmed by webhook.',
          field: 'payload.paymentStatus',
        };
      }
      const normalized = String(requested).trim().toUpperCase();
      if (!(CANONICAL_ORDER_STATUSES as readonly string[]).includes(normalized)) {
        return {
          ok: false,
          code: 'INVALID_STATUS_VALUE',
          message: `'${normalized}' is not a recognised order status.`,
          field: 'payload.orderStatus',
        };
      }
      if ((SERVER_ONLY_STATUSES as readonly string[]).includes(normalized)) {
        return {
          ok: false,
          code: 'SERVER_ONLY_STATUS',
          message: `'${normalized}' is set by server-side fulfilment flows and cannot be commanded by a client.`,
          field: 'payload.orderStatus',
        };
      }
      return {
        ok: true,
        payload: {
          orderStatus: normalized as CanonicalOrderStatus,
          ...(rawPayload.rejectionReason ? { rejectionReason: String(rawPayload.rejectionReason).slice(0, 500) } : {}),
        },
      };
    }

    case 'RecordPayment': {
      const method = normalizePaymentMethod(
        rawPayload.method ?? rawPayload.paymentMethod ?? ctx.order.paymentMethod
      );

      if (isProviderVerifiedPaymentMethod(method)) {
        return {
          ok: false,
          code: 'PROVIDER_VERIFIED_PAYMENT_REQUIRED',
          message: `Payment method '${method}' is settled by the payment gateway. A client command cannot declare it successful; it is set by a verified provider webhook.`,
          field: 'payload.method',
        };
      }

      if (!isStaffRecordedPaymentMethod(method)) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: `Payment method '${method}' cannot be recorded by staff. Allowed: ${STAFF_RECORDED_PAYMENT_METHODS.join(', ')}.`,
          field: 'payload.method',
        };
      }

      const expectedAmount = resolveOrderSettleableAmount(ctx.order);
      const rawAmount = rawPayload.amount;
      if (rawAmount !== undefined) {
        const amount = Number(rawAmount);
        if (!Number.isFinite(amount) || amount <= 0) {
          return {
            ok: false,
            code: 'INVALID_PAYLOAD',
            message: 'payload.amount must be a positive finite number.',
            field: 'payload.amount',
          };
        }
        // Amount integrity: a staff command may only record the full settleable
        // amount, never an arbitrary figure.
        if (expectedAmount !== null && Math.abs(amount - expectedAmount) > 0.01) {
          return {
            ok: false,
            code: 'PAYMENT_AMOUNT_MISMATCH',
            message: `Recorded amount ${amount} does not match the order settleable amount ${expectedAmount}.`,
            field: 'payload.amount',
          };
        }
      }

      const reference = rawPayload.reference ?? rawPayload.paymentReference;
      if (reference !== undefined && !isNonEmptyString(String(reference), 200)) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'payload.reference must be a non-empty string of at most 200 characters.',
          field: 'payload.reference',
        };
      }

      return {
        ok: true,
        payload: {
          method,
          ...(rawAmount !== undefined ? { amount: Number(rawAmount) } : {}),
          ...(reference ? { reference: String(reference).trim() } : {}),
        },
      };
    }

    case 'CreateKot': {
      const items = rawPayload.items;
      if (items !== undefined && !Array.isArray(items)) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'payload.items must be an array when provided.',
          field: 'payload.items',
        };
      }
      const sourceItems: unknown[] = Array.isArray(items)
        ? items
        : Array.isArray(ctx.order.items)
          ? (ctx.order.items as unknown[])
          : [];
      const normalizedItems = sourceItems.map((item, index) => {
        const entry = isPlainObject(item) ? item : {};
        return {
          itemId: String(entry.itemId ?? entry.menuItemId ?? ''),
          name: String(entry.name ?? `Item ${index + 1}`).slice(0, 200),
          quantity: Math.max(1, Number(entry.quantity ?? 1) || 1),
          ...(entry.notes ? { notes: String(entry.notes).slice(0, 300) } : {}),
        };
      });
      const rawKot = rawPayload.kotNumber;
      const kotNumber =
        rawKot === undefined ? undefined : Math.max(1, Number(rawKot) || 0);
      if (kotNumber === undefined || !Number.isFinite(kotNumber)) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'payload.kotNumber must be a positive number when provided.',
          field: 'payload.kotNumber',
        };
      }
      /**
       * An empty KOT is rejected rather than stored. It would print a blank
       * ticket, leave the order flagged as sent to the kitchen, and teach the
       * kitchen staff nothing about what to cook.
       */
      if (normalizedItems.length === 0) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'payload.items must contain at least one item.',
          field: 'payload.items',
        };
      }
      return {
        ok: true,
        payload: { items: normalizedItems, kotNumber },
      };
    }

    default: {
      const exhaustive: never = type;
      return {
        ok: false,
        code: 'UNSUPPORTED_COMMAND',
        message: `Unsupported command type '${String(exhaustive)}'.`,
      };
    }
  }
};

/**
 * Amount a staff member may settle: the order total, or the outstanding balance
 * when partial payments have already been recorded.
 */
export const resolveOrderSettleableAmount = (order: Record<string, unknown>): number | null => {
  const pricing = isPlainObject(order.pricing) ? order.pricing : {};
  const totalRaw = order.totalAmount ?? order.total ?? pricing.total ?? pricing.grandTotal;
  const total = Number(totalRaw);
  if (!Number.isFinite(total) || total <= 0) return null;

  const alreadyPaid = Array.isArray(order.payments)
    ? order.payments.reduce((sum, entry) => {
        const amount = Number((entry as Record<string, unknown>)?.amount ?? 0);
        return Number.isFinite(amount) && amount > 0 ? sum + amount : sum;
      }, 0)
    : 0;

  const outstanding = Math.round((total - alreadyPaid) * 100) / 100;
  return outstanding > 0.009 ? outstanding : null;
};

/**
 * Validate the wire envelope. Idempotency-Key is validated separately because it
 * arrives as an HTTP header.
 */
export const validateCommandEnvelope = (
  body: unknown,
  idempotencyKey: string | undefined
): CommandValidationResult => {
  if (idempotencyKey === undefined || idempotencyKey === null || String(idempotencyKey).trim() === '') {
    return {
      ok: false,
      code: 'MISSING_IDEMPOTENCY_KEY',
      message: 'Idempotency-Key header is required.',
    };
  }
  if (!isValidIdempotencyKey(idempotencyKey)) {
    return {
      ok: false,
      code: 'INVALID_IDEMPOTENCY_KEY',
      message: `Idempotency-Key must be ${IDEMPOTENCY_KEY_MIN}-${IDEMPOTENCY_KEY_MAX} characters.`,
    };
  }
  if (!isPlainObject(body)) {
    return { ok: false, code: 'INVALID_ENVELOPE', message: 'Request body must be a JSON object.' };
  }
  if (!isNonEmptyString(body.commandId, 128)) {
    return {
      ok: false,
      code: 'INVALID_ENVELOPE',
      message: 'commandId is required and must be a non-empty string of at most 128 characters.',
      field: 'commandId',
    };
  }
  if (!isOrderCommandType(body.type)) {
    return {
      ok: false,
      code: 'UNSUPPORTED_COMMAND',
      message: `type must be one of: ${ORDER_COMMAND_TYPES.join(', ')}.`,
      field: 'type',
    };
  }
  if (!isNonEmptyString(body.tenantId, 128)) {
    return { ok: false, code: 'INVALID_ENVELOPE', message: 'tenantId is required.', field: 'tenantId' };
  }
  if (!isNonEmptyString(body.orderId, 128)) {
    return { ok: false, code: 'INVALID_ENVELOPE', message: 'orderId is required.', field: 'orderId' };
  }
  if (body.deviceId !== undefined && !isNonEmptyString(String(body.deviceId), 128)) {
    return {
      ok: false,
      code: 'INVALID_ENVELOPE',
      message: 'deviceId must be a non-empty string of at most 128 characters.',
      field: 'deviceId',
    };
  }
  if (
    body.clientSequence !== undefined &&
    (!Number.isInteger(body.clientSequence) || Number(body.clientSequence) < 0)
  ) {
    return {
      ok: false,
      code: 'INVALID_ENVELOPE',
      message: 'clientSequence must be a non-negative integer.',
      field: 'clientSequence',
    };
  }
  if (
    body.expectedVersion !== undefined &&
    (!Number.isInteger(body.expectedVersion) || Number(body.expectedVersion) < 1)
  ) {
    return {
      ok: false,
      code: 'INVALID_ENVELOPE',
      message: 'expectedVersion must be a positive integer when provided.',
      field: 'expectedVersion',
    };
  }
  if (body.clientTime !== undefined && !isNonEmptyString(String(body.clientTime), 64)) {
    return {
      ok: false,
      code: 'INVALID_ENVELOPE',
      message: 'clientTime must be an ISO-8601 string of at most 64 characters.',
      field: 'clientTime',
    };
  }

  const envelope: OrderCommandEnvelope = {
    commandId: body.commandId.trim(),
    type: body.type,
    tenantId: body.tenantId.trim(),
    orderId: body.orderId.trim(),
    deviceId: body.deviceId ? String(body.deviceId) : undefined,
    clientSequence: Number.isInteger(body.clientSequence) ? Number(body.clientSequence) : undefined,
    clientTime: body.clientTime ? String(body.clientTime) : undefined,
    expectedVersion: Number.isInteger(body.expectedVersion) ? Number(body.expectedVersion) : undefined,
    payload: isPlainObject(body.payload) ? body.payload : {},
  };

  return { ok: true, envelope };
};

/**
 * Stable fingerprint of the semantic content of a command. Two requests with
 * the same idempotency key must produce the same hash; a mismatch means the
 * client reused a key for different work and must be rejected.
 */
export const commandPayloadFingerprint = (envelope: OrderCommandEnvelope): string => {
  const canonical = JSON.stringify({
    type: envelope.type,
    tenantId: envelope.tenantId,
    orderId: envelope.orderId,
    expectedVersion: envelope.expectedVersion ?? null,
    payload: sortKeys(envelope.payload),
  });
  // FNV-1a 64-bit rendered as hex — dependency free and sufficient for
  // detecting accidental or malicious key reuse.
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;
  for (let i = 0; i < canonical.length; i += 1) {
    hash ^= BigInt(canonical.charCodeAt(i));
    hash = (hash * prime) & mask;
  }
  return hash.toString(16).padStart(16, '0');
};

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (isPlainObject(value)) {
    return Object.keys(value)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = sortKeys(value[key]);
        return acc;
      }, {});
  }
  return value;
};