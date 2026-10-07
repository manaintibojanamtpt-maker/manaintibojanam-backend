/**
 * Phase A / C — Authoritative order command processor.
 *
 * Single writer for commerce mutations on `orders/{orderId}`. Every product
 * action (accept, reject, kitchen progression, staff payment, KOT) arrives as a
 * validated, discriminated command and is applied inside one Firestore
 * transaction that atomically persists:
 *
 *   1. the business state change (order status / payment / KOT),
 *   2. the monotonic `version` used for optimistic concurrency,
 *   3. the durable command outcome record (idempotency),
 *   4. the durable outbox event for downstream projections.
 *
 * Payment-provider calls are never performed here: gateway settlement arrives
 * out-of-band through verified webhooks, so this path stays retry-safe.
 */

import type { Firestore, FieldValue as FieldValueType, Transaction } from 'firebase-admin/firestore';
import { assertFulfillmentTransition } from '../paymentGate';
import {
  evaluateOrderTransition,
  orderStatusEventType,
  resolveOrderStatus,
  type CanonicalOrderStatus,
} from './canonicalOrderLifecycle';
import {
  commandPayloadFingerprint,
  httpStatusForCommandError,
  isRoleAllowedForCommand,
  normalizePaymentMethod,
  normalizePaymentStatus,
  resolveOrderSettleableAmount,
  validateCommandPayload,
  type CommandActor,
  type NormalizedCreateOrderPayload,
  type OrderCommandEnvelope,
  type OrderCommandErrorCode,
  type OrderCommandType,
} from './orderCommandContract';
import {
  METRIC,
  logStructured,
  recordCounter,
  recordValue,
} from './orderObservability';

export type { OrderCommandEnvelope, OrderCommandType } from './orderCommandContract';

export interface CommandProcessingResult {
  success: boolean;
  commandId: string;
  tenantId: string;
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  version: number;
  executedAt: string;
  /** True when the response was served from a previously committed outcome. */
  replayed?: boolean;
  correlationId?: string;
  eventId?: string;
  error?: {
    code: OrderCommandErrorCode;
    message: string;
    retryable: boolean;
    /** Populated for concurrency conflicts so clients can re-read and retry. */
    currentVersion?: number;
    currentOrderStatus?: string;
  };
}

const COMMAND_COLLECTION = 'order_commands';
const OUTBOX_COLLECTION = 'outbox';

/**
 * Outcomes that are pinned as a durable receipt.
 *
 * These are deterministic properties of the command itself — a malformed
 * payload or a transition the order can never make — so re-sending the same key
 * must keep returning the same answer. Optimistic failures are excluded on
 * purpose: see `writeReceipt` below.
 */
const PERSISTED_RECEIPT_CODES: ReadonlySet<OrderCommandErrorCode> = new Set<OrderCommandErrorCode>([
  'TENANT_MISMATCH',
  'INVALID_PAYLOAD',
  'INVALID_ORDER_ITEMS',
  'INVALID_STATUS_VALUE',
  'UNSUPPORTED_COMMAND',
  'SERVER_ONLY_STATUS',
  'PAYMENT_STATUS_NOT_WRITABLE',
  'PROVIDER_VERIFIED_PAYMENT_REQUIRED',
  'PAYMENT_AMOUNT_MISMATCH',
  'PAYMENT_NOT_VERIFIED',
]);

/**
 * Failures that describe the order's state at this instant rather than the
 * command. Retrying the same command id after re-reading state must be able to
 * succeed, so they are never written to `order_commands`.
 */
export const OPTIMISTIC_FAILURE_CODES: ReadonlySet<OrderCommandErrorCode> = new Set<OrderCommandErrorCode>([
  'CONCURRENCY_CONFLICT',
  'ORDER_NOT_FOUND',
  'INVALID_TRANSITION',
  'TERMINAL_ORDER',
  'PAYMENT_ALREADY_SETTLED',
]);

/**
 * Idempotency is scoped by tenant *and* command id. Without the tenant segment
 * a client-chosen commandId from one tenant could collide with another tenant's
 * record and be served the wrong outcome.
 */
export const commandRecordId = (tenantId: string, commandId: string): string =>
  `${tenantId}__${commandId}`;

/**
 * Deterministic outbox event id. Replaying an acknowledged command produces the
 * same id, so a duplicate delivery can be detected downstream by document id
 * alone.
 */
export const outboxEventId = (tenantId: string, commandId: string): string =>
  `${tenantId}__${commandId}`;

const readString = (value: unknown): string =>
  typeof value === 'string' ? value.trim() : '';

const readNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

/** Resolve the tenant that owns an order document. */
export const resolveOrderTenantId = (order: Record<string, unknown>): string =>
  readString(order.tenantId) || readString(order.restaurantId);

const fail = (
  base: Pick<
    CommandProcessingResult,
    'commandId' | 'tenantId' | 'orderId' | 'orderStatus' | 'paymentStatus' | 'version'
  >,
  code: OrderCommandErrorCode,
  message: string,
  extra?: { currentVersion?: number; currentOrderStatus?: string; correlationId?: string }
): CommandProcessingResult => ({
  success: false,
  ...base,
  executedAt: new Date().toISOString(),
  correlationId: extra?.correlationId,
  error: {
    code,
    message,
    retryable: code === 'CONCURRENCY_CONFLICT' || code === 'INTERNAL_ERROR',
    ...(extra?.currentVersion !== undefined ? { currentVersion: extra.currentVersion } : {}),
    ...(extra?.currentOrderStatus !== undefined ? { currentOrderStatus: extra.currentOrderStatus } : {}),
  },
});

const toHttpStatus = (result: CommandProcessingResult): number =>
  result.error ? httpStatusForCommandError(result.error.code) : 200;

export { toHttpStatus as httpStatusForProcessingResult };

/**
 * Authorise the actor for the command. Tenant membership is checked first so a
 * valid user from another tenant cannot learn whether an order exists.
 *
 * The role matrix is enforced here as well as in the route. The route check can
 * be bypassed by any direct caller — another backend module, an admin script, a
 * future internal endpoint — and a kitchen-only account recording a payment is
 * exactly the failure this path exists to prevent.
 */
export const authorizeCommand = (
  command: OrderCommandEnvelope,
  actor: CommandActor
): { allowed: true } | { allowed: false; code: OrderCommandErrorCode; message: string } => {
  if (actor.role === 'admin' || actor.role === 'system') {
    return { allowed: true };
  }
  if (!actor.tenantIds.includes(command.tenantId)) {
    return {
      allowed: false,
      code: 'FORBIDDEN_TENANT',
      message: 'Authenticated user is not a member of this tenant.',
    };
  }
  if (!isRoleAllowedForCommand(command.type, actor.role)) {
    return {
      allowed: false,
      code: 'FORBIDDEN_ROLE',
      message: `Role '${actor.role}' may not execute ${command.type}.`,
    };
  }
  return { allowed: true };
};

interface OrderWritePlan {
  /**
   * `create` writes the whole order document (only `CreateOrder`); `update`
   * patches the existing document.
   */
  mode: 'create' | 'update';
  orderUpdates: Record<string, unknown>;
  /** Full document to `set` when `mode === 'create'`. */
  document?: Record<string, unknown>;
  nextOrderStatus: CanonicalOrderStatus | null;
  nextPaymentStatus: string;
  eventType: string;
  /** Commands that do not move lifecycle still bump version (payment, KOT). */
  bumpsVersion: boolean;
}

/**
 * Build the authoritative order document for a `CreateOrder` command.
 *
 * The document id is the client-chosen `command.orderId`: a POS offline terminal
 * mints that id once, keeps it in IndexedDB, and reuses it on every retry, so the
 * identity survives a network outage without a server round trip.
 *
 * Money is taken from the validated payload, which the contract already derived
 * server-side. Nothing here reads a client total.
 */
export const buildCreateOrderDocument = (
  command: OrderCommandEnvelope,
  payload: NormalizedCreateOrderPayload,
  actor: CommandActor,
  nowIso: string,
  createdAtField: unknown
): Record<string, unknown> => ({
  tenantId: command.tenantId,
  restaurantId: command.tenantId,
  orderId: command.orderId,
  // Durable client identity, echoed back so support can trace a walk-in order
  // back to the terminal that minted it.
  clientOrderId: command.orderId,
  creatingCommandId: command.commandId,
  deviceId: command.deviceId ?? null,
  onlineOrderId: command.orderId,
  orderSource: 'WALK_IN',
  source: 'pos_command_create_order',
  ...(payload.orderNumber !== undefined ? { orderNumber: payload.orderNumber } : {}),
  orderType: payload.orderType,
  // Both spellings are written: `orderStatus` is canonical and `status` is kept
  // for legacy consumers during the deprecation window.
  orderStatus: 'PLACED',
  status: 'PLACED',
  paymentMethod: payload.paymentMethod,
  paymentStatus: 'PENDING',
  isCOD: payload.paymentMethod === 'CASH',
  customer: payload.customer,
  customerName: payload.customer.name,
  phone: payload.customer.phone || null,
  ...(payload.customer.address ? { address: payload.customer.address } : {}),
  items: payload.items.map((item) => ({
    itemId: item.itemId,
    menuItemId: item.itemId,
    name: item.name,
    unitPrice: item.unitPrice,
    price: item.unitPrice,
    quantity: item.quantity,
    lineSubtotal: item.lineTotal,
    lineTotal: item.lineTotal,
    ...(item.notes ? { notes: item.notes } : {}),
  })),
  subtotal: payload.pricing.subtotal,
  discountAmount: payload.pricing.discount,
  gst: payload.gstPercent,
  gstAmount: payload.pricing.taxes,
  packingFee: 0,
  deliveryFee: 0,
  totalAmount: payload.pricing.total,
  total: payload.pricing.total,
  pricing: {
    subtotal: payload.pricing.subtotal,
    taxes: payload.pricing.taxes,
    deliveryFee: 0,
    packingFee: 0,
    discount: payload.pricing.discount,
    total: payload.pricing.total,
  },
  /**
   * `client_unverified` means no tenant menu document priced one or more lines,
   * so the bill rests on the terminal's cached price. Surfaced on the order so
   * a later reconciliation can flag it instead of discovering it silently.
   */
  pricingSource: payload.pricing.pricingSource,
  pricingVerifiedAt: payload.pricing.pricingSource === 'menu' ? nowIso : null,
  discountPercent: payload.discountPercent,
  payments: [],
  kots: [],
  timeline: [
    {
      event: 'command.CreateOrder',
      commandId: command.commandId,
      actorUid: actor.uid,
      actorRole: actor.role,
      previousStatus: null,
      newStatus: 'PLACED',
      correlationId: command.correlationId ?? null,
      occurredAt: nowIso,
    },
  ],
  timestamps: { createdAt: nowIso },
  version: 1,
  createdBy: actor.uid,
  createdByRole: actor.role,
  // Authoritative server clock, not the terminal's.
  createdAt: createdAtField,
  updatedAt: createdAtField,
});

/**
 * Pure reducer: given the current order and a validated command, decide the
 * writes. Kept separate from the transaction so every business rule is unit
 * testable without Firestore.
 */
export const planOrderCommand = (
  order: Record<string, unknown>,
  command: OrderCommandEnvelope,
  payload: Record<string, unknown>,
  actor: CommandActor,
  nowIso: string,
  createdAtField: unknown = null
): { ok: true; plan: OrderWritePlan } | { ok: false; code: OrderCommandErrorCode; message: string } => {
  /**
   * Order creation is the only command that does not read existing state, so it
   * is planned before anything resolves a current status.
   */
  if (command.type === 'CreateOrder') {
    const created = payload as unknown as NormalizedCreateOrderPayload;
    return {
      ok: true,
      plan: {
        mode: 'create',
        orderUpdates: {},
        document: buildCreateOrderDocument(command, created, actor, nowIso, createdAtField),
        nextOrderStatus: 'PLACED',
        nextPaymentStatus: 'PENDING',
        eventType: 'order.placed',
        bumpsVersion: true,
      },
    };
  }

  const currentVersion = Math.max(1, readNumber(order.version, 1));
  const currentOrderStatus = resolveOrderStatus(order.orderStatus ?? order.status, true);
  if (!currentOrderStatus) {
    return {
      ok: false,
      code: 'INVALID_STATUS_VALUE',
      message: `Stored order status '${String(order.orderStatus ?? order.status)}' is not a recognised lifecycle value.`,
    };
  }
  const currentPaymentStatus = normalizePaymentStatus(order.paymentStatus) ?? 'PENDING';

  const timestamps: Record<string, unknown> = {
    ...((order.timestamps as Record<string, unknown>) ?? {}),
  };
  const existingTimeline = Array.isArray(order.timeline) ? (order.timeline as unknown[]) : [];

  let nextOrderStatus: CanonicalOrderStatus | null = currentOrderStatus;
  let nextPaymentStatus: string = currentPaymentStatus;
  let eventType: string = 'order.updated';
  let rejectionReason = readString(order.rejectionReason);
  let paymentsAppended: Record<string, unknown>[] | null = null;
  let kotsAppended: Record<string, unknown>[] | null = null;

  switch (command.type) {
    case 'AcceptOrder':
      nextOrderStatus = 'ACCEPTED';
      timestamps.acceptedAt = timestamps.acceptedAt ?? nowIso;
      eventType = orderStatusEventType('ACCEPTED');
      break;

    case 'RejectOrder':
      nextOrderStatus = 'REJECTED';
      rejectionReason = readString(payload.rejectionReason);
      timestamps.rejectedAt = nowIso;
      eventType = orderStatusEventType('REJECTED');
      break;

    case 'MarkPreparing':
      nextOrderStatus = 'PREPARING';
      timestamps.preparingAt = nowIso;
      eventType = orderStatusEventType('PREPARING');
      break;

    case 'MarkReady':
      nextOrderStatus = 'READY';
      timestamps.readyAt = nowIso;
      eventType = orderStatusEventType('READY');
      break;

    case 'UpdateOrderStatus':
      nextOrderStatus = String(payload.orderStatus) as CanonicalOrderStatus;
      if (nextOrderStatus === 'REJECTED' && !readString(payload.rejectionReason)) {
        return {
          ok: false,
          code: 'INVALID_PAYLOAD',
          message: 'Rejecting an order via UpdateOrderStatus requires payload.rejectionReason.',
        };
      }
      if (readString(payload.rejectionReason)) {
        rejectionReason = readString(payload.rejectionReason);
        timestamps.rejectedAt = nowIso;
      }
      eventType = orderStatusEventType(nextOrderStatus);
      break;

    case 'RecordPayment': {
      const method = normalizePaymentMethod(payload.method);
      if (normalizePaymentStatus(order.paymentStatus) === 'VERIFIED') {
        return {
          ok: false,
          code: 'PAYMENT_ALREADY_SETTLED',
          message: 'Order payment has already been verified by the payment gateway.',
        };
      }
      const settleable = resolveOrderSettleableAmount(order);
      if (settleable === null) {
        return {
          ok: false,
          code: 'PAYMENT_AMOUNT_MISMATCH',
          message: 'Order has no settleable amount remaining; payment cannot be recorded.',
        };
      }
      const amount = payload.amount !== undefined ? readNumber(payload.amount, settleable) : settleable;
      if (Math.abs(amount - settleable) > 0.01) {
        return {
          ok: false,
          code: 'PAYMENT_AMOUNT_MISMATCH',
          message: `Recorded amount ${amount} does not match the settleable amount ${settleable}.`,
        };
      }
      nextPaymentStatus = 'RECORDED';
      timestamps.paymentRecordedAt = nowIso;
      paymentsAppended = [
        {
          paymentId: `pay_${command.commandId}`,
          commandId: command.commandId,
          tenantId: command.tenantId,
          orderId: command.orderId,
          amount,
          method,
          // Staff-recorded money is *recorded*, not gateway-*verified*. The two
          // are distinct concepts and are never collapsed.
          status: 'RECORDED',
          recordedAt: nowIso,
          recordedBy: actor.uid,
          recordedByRole: actor.role,
          ...(payload.reference ? { reference: readString(payload.reference) } : {}),
        },
      ];
      eventType = 'order.payment.recorded';
      break;
    }

    case 'CreateKot': {
      const items = Array.isArray(payload.items) ? payload.items : [];
      const kotNumber = readNumber(payload.kotNumber, 1);
      kotsAppended = [
        {
          kotId: `kot_${command.commandId}`,
          commandId: command.commandId,
          tenantId: command.tenantId,
          orderId: command.orderId,
          kotNumber,
          items,
          // Kitchen fulfilment is tracked independently of order lifecycle.
          status: 'PENDING',
          createdAt: nowIso,
          createdBy: actor.uid,
        },
      ];
      eventType = 'order.kot.created';
      break;
    }

    default:
      return {
        ok: false,
        code: 'UNSUPPORTED_COMMAND',
        message: `Unsupported command type '${String((command as OrderCommandEnvelope).type)}'.`,
      };
  }

  // Lifecycle transition validation.
  if (nextOrderStatus !== null && nextOrderStatus !== currentOrderStatus) {
    const decision = evaluateOrderTransition(currentOrderStatus, nextOrderStatus);
    if (!decision.allowed) {
      return { ok: false, code: decision.code ?? 'INVALID_TRANSITION', message: decision.message ?? 'Transition rejected.' };
    }
    // Payment gate. `RECORDED` is the staff-recorded settlement written by a
    // prior RecordPayment command, which already enforced role and amount
    // integrity, so it satisfies the gate exactly like a gateway `verified`.
    const gateInput = {
      ...order,
      paymentStatus: nextPaymentStatus === 'RECORDED' ? 'paid' : order.paymentStatus,
    };
    const gate = assertFulfillmentTransition(gateInput, nextOrderStatus);
    if (!gate.allowed) {
      return { ok: false, code: 'PAYMENT_NOT_VERIFIED', message: gate.error ?? 'Payment gate rejected the transition.' };
    }
  }

  const timelineEntry: Record<string, unknown> = {
    event: `command.${command.type}`,
    commandId: command.commandId,
    actorUid: actor.uid,
    actorRole: actor.role,
    previousStatus: currentOrderStatus,
    newStatus: nextOrderStatus,
    correlationId: command.correlationId ?? null,
    occurredAt: nowIso,
  };

  const orderUpdates: Record<string, unknown> = {
    // `orderStatus` is the canonical lifecycle field. `status` is still written
    // for legacy consumers during the deprecation window.
    orderStatus: nextOrderStatus,
    status: nextOrderStatus,
    paymentStatus: nextPaymentStatus,
    timestamps,
    timeline: [...existingTimeline, timelineEntry],
    version: currentVersion + 1,
  };
  if (rejectionReason) orderUpdates.rejectionReason = rejectionReason;
  if (paymentsAppended) {
    const existingPayments = Array.isArray(order.payments) ? (order.payments as Record<string, unknown>[]) : [];
    orderUpdates.payments = [...existingPayments, ...paymentsAppended];
  }
  if (kotsAppended) {
    const existingKots = Array.isArray(order.kots) ? (order.kots as Record<string, unknown>[]) : [];
    orderUpdates.kots = [...existingKots, ...kotsAppended];
  }

  return {
    ok: true,
    plan: {
      mode: 'update',
      orderUpdates,
      nextOrderStatus,
      nextPaymentStatus,
      eventType,
      bumpsVersion: true,
    },
  };
};

export interface ProcessOrderCommandOptions {
  db: Firestore;
  fieldValue: typeof FieldValueType;
  command: OrderCommandEnvelope;
  actor: CommandActor;
  correlationId?: string;
}

export const processOrderCommand = async (
  db: Firestore,
  fieldValue: typeof FieldValueType,
  command: OrderCommandEnvelope,
  actor: CommandActor,
  correlationId?: string
): Promise<CommandProcessingResult> => {
  const startedAt = Date.now();
  const correlation = correlationId ?? command.correlationId ?? command.commandId;
  const fingerprint = commandPayloadFingerprint(command);

  const base = {
    commandId: command.commandId ?? '',
    tenantId: command.tenantId ?? '',
    orderId: command.orderId ?? '',
    orderStatus: 'UNKNOWN',
    paymentStatus: 'UNKNOWN',
    version: 0,
  };

  if (!command.commandId || !command.type || !command.tenantId || !command.orderId) {
    recordCounter(METRIC.commandFailed, 1, { code: 'INVALID_ENVELOPE' });
    logStructured('warn', 'order_command.invalid_envelope', { correlationId: correlation });
    return fail(base, 'INVALID_ENVELOPE', 'Missing required command envelope fields.', {
      correlationId: correlation,
    });
  }

  const authorization = authorizeCommand(command, actor);
  if ('code' in authorization) {
    recordCounter(METRIC.authRejected, 1, { code: authorization.code });
    logStructured('warn', 'order_command.forbidden', {
      correlationId: correlation,
      tenantId: command.tenantId,
      orderId: command.orderId,
      actorUid: actor.uid,
      actorRole: actor.role,
      code: authorization.code,
    });
    return fail(base, authorization.code, authorization.message, { correlationId: correlation });
  }

  const commandRef = db.collection(COMMAND_COLLECTION).doc(commandRecordId(command.tenantId, command.commandId));
  const orderRef = db.collection('orders').doc(command.orderId);
  const outboxRef = db.collection(OUTBOX_COLLECTION).doc(outboxEventId(command.tenantId, command.commandId));

  /**
   * A receipt is the client's promise that this outcome is final, so it is only
   * written for outcomes that stay true no matter what the order does next.
   *
   * Optimistic failures are deliberately excluded. Pinning a concurrency
   * conflict would make the command unretryable: the client would have to
   * change `expectedVersion`, which changes the fingerprint, which then reads
   * as a key reused for different work. The same applies to a missing order,
   * which is exactly the state a walk-in order is in before it is created.
   */
  const writeReceipt = (
    transaction: Transaction,
    code: OrderCommandErrorCode,
    outcome: CommandProcessingResult
  ): void => {
    if (!PERSISTED_RECEIPT_CODES.has(code)) return;
    transaction.set(commandRef, {
      ...outcome,
      fingerprint,
      commandType: command.type,
      actorUid: actor.uid,
      actorRole: actor.role,
      recordedAt: fieldValue.serverTimestamp(),
    });
  };

  recordCounter(METRIC.commandReceived, 1, { type: command.type });

  return db.runTransaction(async (transaction) => {
    // 1. Idempotency. A committed outcome is returned verbatim; a key reused for
    //    different work is a hard conflict the client must resolve.
    const existingCommand = await transaction.get(commandRef);
    if (existingCommand.exists) {
      const existing = existingCommand.data() as Record<string, unknown>;
      if (existing.fingerprint !== fingerprint) {
        recordCounter(METRIC.idempotencyConflict);
        logStructured('warn', 'order_command.idempotency_conflict', {
          correlationId: correlation,
          tenantId: command.tenantId,
          orderId: command.orderId,
          commandId: command.commandId,
        });
        return fail(
          {
            ...base,
            orderStatus: String(existing.orderStatus ?? 'UNKNOWN'),
            paymentStatus: String(existing.paymentStatus ?? 'UNKNOWN'),
            version: readNumber(existing.version, 0),
          },
          'IDEMPOTENCY_KEY_CONFLICT',
          'This Idempotency-Key was already used for a different command payload.',
          { correlationId: correlation }
        );
      }
      recordCounter(METRIC.commandReplayed);
      recordValue(METRIC.commandLatency, Date.now() - startedAt, { type: command.type, outcome: 'replayed' });
      return {
        success: existing.success === true,
        commandId: command.commandId,
        tenantId: command.tenantId,
        orderId: command.orderId,
        orderStatus: String(existing.orderStatus ?? 'UNKNOWN'),
        paymentStatus: String(existing.paymentStatus ?? 'UNKNOWN'),
        version: readNumber(existing.version, 0),
        executedAt: String(existing.executedAt ?? new Date().toISOString()),
        replayed: true,
        correlationId: String(existing.correlationId ?? correlation),
        eventId: typeof existing.eventId === 'string' ? existing.eventId : undefined,
        ...(existing.error ? { error: existing.error as CommandProcessingResult['error'] } : {}),
      } satisfies CommandProcessingResult;
    }

    // 2. Load the order. `CreateOrder` is the only command allowed to run
    //    against a document that does not exist yet.
    const isCreateOrder = command.type === 'CreateOrder';
    const orderDoc = await transaction.get(orderRef);

    if (isCreateOrder && orderDoc.exists) {
      /**
       * The document id is client-chosen, so a collision is a real possibility:
       * two terminals, or one terminal that minted the same id twice. The
       * idempotency check above already handled a *replay* of this command, so
       * reaching here means a different command created the row.
       *
       * No receipt is pinned: after an operator resolves the duplicate id, the
       * same command id must still be able to succeed.
       */
      const existingOrder = (orderDoc.data() ?? {}) as Record<string, unknown>;
      const result = fail(
        {
          ...base,
          orderStatus: String(existingOrder.orderStatus ?? existingOrder.status ?? 'UNKNOWN'),
          paymentStatus: String(existingOrder.paymentStatus ?? 'UNKNOWN'),
          version: readNumber(existingOrder.version, 0),
        },
        'ORDER_ALREADY_EXISTS',
        `Order ${command.orderId} already exists and was not created by this command. Resolve the duplicate order id before retrying.`,
        {
          correlationId: correlation,
          currentVersion: Math.max(1, readNumber(existingOrder.version, 1)),
        }
      );
      recordCounter(METRIC.commandFailed, 1, { code: 'ORDER_ALREADY_EXISTS' });
      logStructured('warn', 'order_command.order_already_exists', {
        correlationId: correlation,
        tenantId: command.tenantId,
        orderId: command.orderId,
        commandId: command.commandId,
        createdByCommandId: existingOrder.creatingCommandId ?? null,
      });
      return result;
    }

    if (!isCreateOrder && !orderDoc.exists) {
      const result = fail(base, 'ORDER_NOT_FOUND', `Order ${command.orderId} does not exist.`, {
        correlationId: correlation,
      });
      writeReceipt(transaction, 'ORDER_NOT_FOUND', result);
      recordCounter(METRIC.commandFailed, 1, { code: 'ORDER_NOT_FOUND' });
      logStructured('warn', 'order_command.order_not_found', {
        correlationId: correlation,
        tenantId: command.tenantId,
        orderId: command.orderId,
        commandId: command.commandId,
      });
      return result;
    }

    const order = (orderDoc.data() ?? {}) as Record<string, unknown>;
    const orderTenantId = resolveOrderTenantId(order);
    /**
     * A created order starts at version 1, so version 1 is also the only
     * precondition a `CreateOrder` can legitimately assert.
     */
    const currentVersion = isCreateOrder ? 1 : Math.max(1, readNumber(order.version, 1));
    const currentOrderStatus = isCreateOrder
      ? 'UNKNOWN'
      : resolveOrderStatus(order.orderStatus ?? order.status, true) ?? 'UNKNOWN';
    const currentPaymentStatus = isCreateOrder ? 'PENDING' : String(order.paymentStatus ?? 'UNKNOWN');
    const observed = {
      ...base,
      orderStatus: currentOrderStatus,
      paymentStatus: currentPaymentStatus,
      version: currentVersion,
    };

    // 3. Resource ownership. Cross-tenant access must not be distinguishable
    //    from a missing order for non-admins, but we still record the attempt.
    if (orderTenantId && orderTenantId !== command.tenantId) {
      const result = fail(observed, 'TENANT_MISMATCH', 'Order does not belong to this tenant.', {
        correlationId: correlation,
      });
      writeReceipt(transaction, 'TENANT_MISMATCH', result);
      recordCounter(METRIC.authRejected, 1, { code: 'TENANT_MISMATCH' });
      logStructured('warn', 'order_command.tenant_mismatch', {
        correlationId: correlation,
        tenantId: command.tenantId,
        orderTenantId,
        orderId: command.orderId,
      });
      return result;
    }

    /**
     * 4. Optimistic concurrency. The POS sends the version it last confirmed.
     *
     * A brand new order has no prior version, so `CreateOrder` accepts only an
     * absent precondition or an explicit `1`. Anything else is a client that
     * believes it is updating an order it has not created yet.
     */
    if (command.expectedVersion !== undefined && command.expectedVersion !== currentVersion) {
      const result = fail(observed, 'CONCURRENCY_CONFLICT', 'Order changed since it was last read.', {
        correlationId: correlation,
        currentVersion,
        currentOrderStatus,
      });
      // No receipt: the client re-reads and retries this same command id.
      recordCounter(METRIC.concurrencyConflict);
      return result;
    }

    // 5. Business validation + pure write plan.
    /**
     * Order creation prices the bill from the tenant's published menu, read in
     * the same transaction so a price cannot change between validation and
     * commit.
     */
    let menuPrices: Record<string, number> | undefined;
    if (isCreateOrder) {
      const requestedItemIds = Array.isArray(command.payload.items)
        ? command.payload.items
            .map((entry) => String((entry as Record<string, unknown>)?.itemId ?? '').trim())
            .filter((itemId) => itemId.length > 0)
        : [];
      if (requestedItemIds.length > 0) {
        const menuRefs = [...new Set(requestedItemIds)].map((itemId) =>
          db.collection('menu').doc(itemId)
        );
        const menuSnaps = await transaction.getAll(...menuRefs);
        menuPrices = {};
        for (const snap of menuSnaps) {
          const data = (snap.data() ?? {}) as Record<string, unknown>;
          const price = Number(data.price);
          if (Number.isFinite(price) && price > 0) menuPrices[snap.id] = price;
        }
      }
    }

    const payloadValidation = validateCommandPayload(command.type, command.payload, {
      order,
      ...(menuPrices ? { menuPrices } : {}),
    });
    if ('code' in payloadValidation) {
      const result = fail(observed, payloadValidation.code, payloadValidation.message, {
        correlationId: correlation,
      });
      writeReceipt(transaction, payloadValidation.code, result);
      recordCounter(METRIC.commandFailed, 1, { code: payloadValidation.code });
      return result;
    }

    const planned = planOrderCommand(
      order,
      command,
      payloadValidation.payload,
      actor,
      new Date().toISOString(),
      fieldValue.serverTimestamp()
    );
    if ('code' in planned) {
      const result = fail(observed, planned.code, planned.message, { correlationId: correlation });
      writeReceipt(transaction, planned.code, result);
      recordCounter(METRIC.commandFailed, 1, { code: planned.code });
      logStructured('warn', 'order_command.rejected', {
        correlationId: correlation,
        tenantId: command.tenantId,
        orderId: command.orderId,
        commandId: command.commandId,
        type: command.type,
        code: planned.code,
        fromStatus: currentOrderStatus,
      });
      return result;
    }

    const nowIso = new Date().toISOString();
    const newVersion = planned.plan.mode === 'create' ? 1 : currentVersion + 1;
    const eventId = outboxEventId(command.tenantId, command.commandId);

    // 6. Business state + version, atomically with 7 and 8.
    if (planned.plan.mode === 'create') {
      transaction.set(orderRef, planned.plan.document ?? {});
    } else {
      transaction.update(orderRef, {
        ...planned.plan.orderUpdates,
        updatedAt: fieldValue.serverTimestamp(),
      });
    }

    // 7. Durable outbox event for projections, tracking and notifications.
    transaction.set(outboxRef, {
      eventId,
      type: planned.plan.eventType,
      schemaVersion: 1,
      tenantId: command.tenantId,
      aggregateType: 'order',
      aggregateId: command.orderId,
      commandId: command.commandId,
      idempotencyKey: command.commandId,
      correlationId: correlation,
      causationId: command.commandId,
      actorUid: actor.uid,
      actorRole: actor.role,
      deviceId: command.deviceId ?? null,
      occurredAt: nowIso,
      sequence: command.clientSequence ?? null,
      payload: {
        orderId: command.orderId,
        tenantId: command.tenantId,
        commandType: command.type,
        orderStatus: planned.plan.nextOrderStatus,
        paymentStatus: planned.plan.nextPaymentStatus,
        version: newVersion,
        /**
         * Pricing provenance travels with the event. The `order.placed` intake
         * ledger decides whether an order needs a pricing review from exactly
         * these two fields, and an event that omitted them would make every
         * offline-created order look verified.
         */
        pricingSource: planned.plan.document?.pricingSource ?? order.pricingSource ?? null,
        total: planned.plan.document?.total ?? order.total ?? null,
      },
      status: 'PENDING',
      attempts: 0,
      createdAt: fieldValue.serverTimestamp(),
    });

    // 8. Command outcome record — the durable idempotency receipt.
    const successResult: CommandProcessingResult = {
      success: true,
      commandId: command.commandId,
      tenantId: command.tenantId,
      orderId: command.orderId,
      orderStatus: String(planned.plan.nextOrderStatus ?? currentOrderStatus),
      paymentStatus: planned.plan.nextPaymentStatus,
      version: newVersion,
      executedAt: nowIso,
      correlationId: correlation,
      eventId,
    };
    transaction.set(commandRef, {
      ...successResult,
      fingerprint,
      // The receipt key is stored so support can trace a client-reported
      // Idempotency-Key back to the exact outcome it received.
      idempotencyKey: command.commandId,
      commandType: command.type,
      deviceId: command.deviceId ?? null,
      clientSequence: command.clientSequence ?? null,
      clientTime: command.clientTime ?? null,
      actorUid: actor.uid,
      actorRole: actor.role,
      recordedAt: fieldValue.serverTimestamp(),
    });

    recordCounter(METRIC.commandSucceeded, 1, { type: command.type });
    recordCounter(METRIC.outboxEnqueued);
    recordValue(METRIC.commandLatency, Date.now() - startedAt, { type: command.type, outcome: 'applied' });
    logStructured('info', 'order_command.applied', {
      correlationId: correlation,
      tenantId: command.tenantId,
      orderId: command.orderId,
      commandId: command.commandId,
      eventId,
      type: command.type,
      fromStatus: currentOrderStatus,
      toStatus: planned.plan.nextOrderStatus,
      version: newVersion,
      actorRole: actor.role,
      deviceId: command.deviceId,
    });

    return successResult;
  });
};

export const unsupportedCommandResult = (command: Partial<OrderCommandEnvelope>): CommandProcessingResult =>
  fail(
    {
      commandId: command.commandId ?? '',
      tenantId: command.tenantId ?? '',
      orderId: command.orderId ?? '',
      orderStatus: 'UNKNOWN',
      paymentStatus: 'UNKNOWN',
      version: 0,
    },
    'UNSUPPORTED_COMMAND',
    `Unsupported command type '${String(command.type)}'.`,
    { correlationId: command.correlationId }
  );

export const httpStatusForErrorCode = httpStatusForCommandError;