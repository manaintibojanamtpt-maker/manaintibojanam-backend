/**
 * Map voice/workflow schedule payloads onto kitchen delivery slots.
 * Prefer exact matches; never silently invent a wrong slot on mismatch.
 */

import {
  ASAP_SLOT,
  formatDeliverySlotLabel,
  isAsapSlot,
  resolveDefaultDeliverySlot,
  type CheckoutSchedulingContext,
} from './deliveryTimeSlots';

export type ScheduleSlotResolveReason =
  | 'matched'
  | 'asap_unavailable'
  | 'no_match'
  | 'no_slots'
  | 'kitchen_closed';

export type ScheduleSlotResolveResult =
  | { readonly ok: true; readonly slot: string; readonly reason: 'matched' }
  | { readonly ok: false; readonly reason: Exclude<ScheduleSlotResolveReason, 'matched'>; readonly message: string };

const FRIENDLY: Record<Exclude<ScheduleSlotResolveReason, 'matched'>, string> = {
  asap_unavailable:
    'Deliver now isn’t available from this kitchen right now. Pick a Schedule slot, or try again later.',
  no_match:
    'That time isn’t on this kitchen’s slots. Choose Deliver now or a listed Schedule time.',
  no_slots: 'No delivery times are available from this kitchen right now.',
  kitchen_closed:
    'This kitchen isn’t taking Deliver now orders. Please Schedule a later slot.',
};

function dayPrefix(slotOrLabel: string): 'Today' | 'Tomorrow' | null {
  if (/^tomorrow\b/i.test(slotOrLabel) || /,\s*tomorrow\b/i.test(slotOrLabel)) return 'Tomorrow';
  if (/^today\b/i.test(slotOrLabel)) return 'Today';
  const m = slotOrLabel.match(/^(Today|Tomorrow)\b/i);
  return m ? (m[1]!.toLowerCase() === 'tomorrow' ? 'Tomorrow' : 'Today') : null;
}

function noMatchMessage(wanted: string, availableSlots: readonly string[]): string {
  const wantedDay = dayPrefix(wanted);
  if (!wantedDay) return FRIENDLY.no_match;
  const hasWantedDay = availableSlots.some((s) => dayPrefix(s) === wantedDay);
  if (hasWantedDay) return FRIENDLY.no_match;
  if (wantedDay === 'Tomorrow' && availableSlots.some((s) => dayPrefix(s) === 'Today')) {
    return 'This kitchen has no Tomorrow slots. Choose a Today time, or Deliver now if available.';
  }
  if (wantedDay === 'Today' && availableSlots.some((s) => dayPrefix(s) === 'Tomorrow')) {
    return 'This kitchen has no Today slots for that time. Choose a Tomorrow slot, or another listed time.';
  }
  return FRIENDLY.no_match;
}

/**
 * Strict resolve used by checkout when applying voice preferences.
 * Falls back only when ASAP is requested and an ASAP slot exists.
 */
export function tryResolveSlotFromScheduleAction(
  payload: {
    readonly deliveryType?: string;
    readonly deliveryTimeSlot?: string;
    readonly slotLabel?: string;
  },
  availableSlots: readonly string[],
  scheduling?: CheckoutSchedulingContext | null,
): ScheduleSlotResolveResult {
  if (!availableSlots.length) {
    return { ok: false, reason: 'no_slots', message: FRIENDLY.no_slots };
  }

  const wantsAsap =
    payload.deliveryType === 'asap' || isAsapSlot(payload.deliveryTimeSlot ?? '');

  if (wantsAsap) {
    const asap = availableSlots.find((s) => isAsapSlot(s));
    if (asap) return { ok: true, slot: asap, reason: 'matched' };
    if (scheduling && !scheduling.isStoreOpen) {
      return { ok: false, reason: 'kitchen_closed', message: scheduling.closedMessage || FRIENDLY.kitchen_closed };
    }
    return { ok: false, reason: 'asap_unavailable', message: FRIENDLY.asap_unavailable };
  }

  const wanted = (payload.deliveryTimeSlot || payload.slotLabel || '').trim();
  if (!wanted) {
    return { ok: false, reason: 'no_match', message: FRIENDLY.no_match };
  }

  const exact = availableSlots.find(
    (s) => s === wanted || s.toLowerCase() === wanted.toLowerCase(),
  );
  if (exact) return { ok: true, slot: exact, reason: 'matched' };

  const fuzzy = availableSlots.find((s) => {
    const label = formatDeliverySlotLabel(s).toLowerCase();
    const w = wanted.toLowerCase();
    return s.toLowerCase().includes(w) || label.includes(w) || w.includes(label);
  });
  if (fuzzy) return { ok: true, slot: fuzzy, reason: 'matched' };

  return { ok: false, reason: 'no_match', message: noMatchMessage(wanted, availableSlots) };
}

/**
 * Best-effort resolve for non-strict callers (keeps prior helper behavior for tests).
 */
export function resolveSlotFromScheduleAction(
  payload: {
    readonly deliveryType?: string;
    readonly deliveryTimeSlot?: string;
    readonly slotLabel?: string;
  },
  availableSlots: readonly string[],
): string {
  const strict = tryResolveSlotFromScheduleAction(payload, availableSlots);
  if (strict.ok) return strict.slot;
  const slots = availableSlots.length ? availableSlots : [ASAP_SLOT];
  if (payload.deliveryType === 'asap' || isAsapSlot(payload.deliveryTimeSlot ?? '')) {
    return slots.find((s) => isAsapSlot(s)) ?? resolveDefaultDeliverySlot(slots);
  }
  return slots.find((s) => !isAsapSlot(s)) ?? resolveDefaultDeliverySlot(slots);
}
