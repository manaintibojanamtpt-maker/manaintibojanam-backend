/**
 * Parse voice/workflow set_delivery_schedule stubs from assist proposedActions.
 * Also surfaces schedule clarify/error stubs (ask_clarification → DeliveryTime).
 * Lives in assistant domain so Android Phase 5 stays checkout-import free.
 * Metadata only — never places an order or mutates payment.
 */

export type DeliverySchedulePreference = {
  readonly deliveryType: 'asap' | 'scheduled';
  readonly deliveryTimeSlot?: string;
  readonly slotLabel?: string;
  readonly scheduledFor?: string;
  readonly source: 'voice';
};

export type ScheduleClarifyReason =
  | 'AmbiguousDeliveryTime'
  | 'InvalidDeliveryTime'
  | 'MissingDeliveryTime'
  | 'schedule_clarify';

export type ScheduleVoiceFeedback = {
  readonly kind: 'clarify' | 'error';
  readonly reason: ScheduleClarifyReason | string;
  /** Filled by the client from the assist reply when available. */
  readonly message: string;
};

function readPayload(raw: Record<string, unknown>): Record<string, unknown> | undefined {
  if (raw.payload && typeof raw.payload === 'object' && !Array.isArray(raw.payload)) {
    return raw.payload as Record<string, unknown>;
  }
  return undefined;
}

function isScheduleAction(raw: Record<string, unknown>): boolean {
  const type = typeof raw.type === 'string' ? raw.type : '';
  const reason = typeof raw.reason === 'string' ? raw.reason : '';
  const payload = readPayload(raw);
  const action =
    (typeof payload?.action === 'string' && payload.action) ||
    (typeof raw.action === 'string' && raw.action) ||
    '';
  return (
    type === 'set_delivery_schedule' ||
    reason === 'set_delivery_schedule' ||
    action === 'set_delivery_schedule'
  );
}

function toPreference(raw: Record<string, unknown>): DeliverySchedulePreference | null {
  if (!isScheduleAction(raw)) return null;
  const payload = readPayload(raw) ?? raw;
  const deliveryTypeRaw =
    (typeof payload.deliveryType === 'string' && payload.deliveryType) ||
    (typeof payload.delivery_type === 'string' && payload.delivery_type) ||
    '';
  const deliveryType: 'asap' | 'scheduled' =
    deliveryTypeRaw === 'asap' || /^asap$/i.test(String(payload.deliveryTimeSlot ?? ''))
      ? 'asap'
      : 'scheduled';

  const deliveryTimeSlot =
    (typeof payload.deliveryTimeSlot === 'string' && payload.deliveryTimeSlot.trim()) ||
    undefined;
  const slotLabel =
    (typeof payload.slotLabel === 'string' && payload.slotLabel.trim()) || undefined;
  const scheduledFor =
    (typeof payload.scheduledFor === 'string' && payload.scheduledFor.trim()) || undefined;

  return {
    deliveryType,
    ...(deliveryTimeSlot ? { deliveryTimeSlot } : {}),
    ...(slotLabel ? { slotLabel } : {}),
    ...(scheduledFor ? { scheduledFor } : {}),
    source: 'voice',
  };
}

const SCHEDULE_CLARIFY_REASONS = new Set([
  'AmbiguousDeliveryTime',
  'InvalidDeliveryTime',
  'MissingDeliveryTime',
  'OutOfHorizonDeliveryTime',
  'schedule_clarify',
]);

function isScheduleClarifyAction(raw: Record<string, unknown>): boolean {
  const type = typeof raw.type === 'string' ? raw.type : '';
  const reason = typeof raw.reason === 'string' ? raw.reason : '';
  const payload = readPayload(raw);
  const payloadReason = typeof payload?.reason === 'string' ? payload.reason : '';
  const action = typeof payload?.action === 'string' ? payload.action : '';
  const missing = Array.isArray(payload?.missingEntities)
    ? payload.missingEntities.filter((x): x is string => typeof x === 'string')
    : [];

  if (type === 'ask_clarification' || action === 'schedule_clarify' || reason === 'schedule_clarify') {
    return (
      SCHEDULE_CLARIFY_REASONS.has(payloadReason) ||
      SCHEDULE_CLARIFY_REASONS.has(reason) ||
      missing.includes('DeliveryTime')
    );
  }

  if (type === 'none' && (reason === 'schedule_clarify' || action === 'schedule_clarify')) {
    return true;
  }

  if (type === 'none' && SCHEDULE_CLARIFY_REASONS.has(payloadReason)) {
    return true;
  }

  return false;
}

function toScheduleFeedback(
  raw: Record<string, unknown>,
  replyFallback: string,
): ScheduleVoiceFeedback | null {
  if (!isScheduleClarifyAction(raw)) return null;
  const payload = readPayload(raw);
  const payloadReason =
    (typeof payload?.reason === 'string' && payload.reason) ||
    (typeof raw.reason === 'string' && raw.reason) ||
    'schedule_clarify';
  const kind: 'clarify' | 'error' =
    payloadReason === 'InvalidDeliveryTime' ? 'error' : 'clarify';
  const message =
    (typeof payload?.message === 'string' && payload.message.trim()) ||
    replyFallback.trim() ||
    (kind === 'error'
      ? 'That delivery time isn’t available. Try Deliver now or another Schedule slot.'
      : 'Please say a clearer delivery time — now, 8 PM, or tomorrow lunch.');

  return { kind, reason: payloadReason, message };
}

/**
 * Extract the latest set_delivery_schedule preference from gateway proposedActions.
 */
export function normalizeDeliveryScheduleActions(
  proposedActions: unknown,
): readonly DeliverySchedulePreference[] {
  if (!Array.isArray(proposedActions)) return [];
  const out: DeliverySchedulePreference[] = [];
  for (const raw of proposedActions) {
    if (!raw || typeof raw !== 'object') continue;
    const pref = toPreference(raw as Record<string, unknown>);
    if (pref) out.push(pref);
  }
  return out;
}

export function pickLatestDeliverySchedulePreference(
  proposedActions: unknown,
): DeliverySchedulePreference | null {
  const all = normalizeDeliveryScheduleActions(proposedActions);
  return all.length ? all[all.length - 1]! : null;
}

/**
 * Extract schedule clarify/error feedback from ask_clarification stubs.
 * Prefer this over applying a schedule preference when present.
 */
export function pickScheduleVoiceFeedback(
  proposedActions: unknown,
  reply = '',
): ScheduleVoiceFeedback | null {
  if (!Array.isArray(proposedActions)) return null;
  let latest: ScheduleVoiceFeedback | null = null;
  for (const raw of proposedActions) {
    if (!raw || typeof raw !== 'object') continue;
    const feedback = toScheduleFeedback(raw as Record<string, unknown>, reply);
    if (feedback) latest = feedback;
  }
  return latest;
}
