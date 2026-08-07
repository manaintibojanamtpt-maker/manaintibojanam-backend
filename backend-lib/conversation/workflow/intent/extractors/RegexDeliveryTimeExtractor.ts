/**
 * Purpose: Deterministic delivery-time extraction (ASAP / clock / meal band / multi-day).
 * Public API: RegexDeliveryTimeExtractor
 * Dependencies: IEntityExtractor, DeliveryTimeEntity
 * Consumers: EntityResolver
 *
 * Aligns with checkout schedule metadata (deliveryType / deliveryTimeSlot) —
 * does not place orders or touch payment.
 *
 * Kitchen horizon for this gate: Today (0) + Tomorrow (1). Offset ≥ 2 → clarify.
 */

import type { IEntityExtractor } from '../IEntityExtractor.js';
import type { DeliveryTimeEntity } from '../../../models/ConversationEntity.js';

const ASAP_RE =
  /\b(asap|deliver\s+now|delivery\s+now|right\s+now|immediately|as\s+soon\s+as\s+possible|now\s+only)\b/i;

const SCHEDULE_VERB_RE =
  /\b(schedule|scheduled|later|deliver\s+later|delivery\s+later|for\s+later|book\s+for|sometime|some\s+time)\b/i;

const VAGUE_BAND_RE = /\b(sometime|some\s+time)?\s*(evening|morning|afternoon)\b/i;

const DAY_AFTER_RE = /\b((the\s+)?day\s+after(\s+tomorrow)?)\b/i;
const TOMORROW_RE = /\btomorrow\b/i;

const CLOCK_RE =
  /\b(?:(?:at|for|by)\s+)(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?\b|\b(\d{1,2}):(\d{2})\s*(am|pm|a\.m\.|p\.m\.)?\b|\b(\d{1,2})\s*(am|pm|a\.m\.|p\.m\.)\b/i;

const LUNCH_RE = /\b(lunch|brunch)\b/i;
const DINNER_RE = /\b(dinner|supper|evening)\b/i;
const BARE_LUNCH_RE = /\b(for\s+)?lunch\b/i;
const BARE_DINNER_RE = /\b(for\s+)?(dinner|tonight)\b/i;
const TODAY_MEAL_PREFIX_RE = /\b(today|this|tonight)\b/i;

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function formatClockLabel(hour24: number, minute: number): string {
  const period = hour24 >= 12 ? 'PM' : 'AM';
  const h12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${h12}:${pad2(minute)} ${period}`;
}

function toHour24(hour: number, minute: number, ampm?: string): { hour24: number; minute: number } | null {
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  let hour24 = hour;
  const mer = ampm?.replace(/\./g, '').toLowerCase();
  if (mer === 'pm' && hour < 12) hour24 = hour + 12;
  else if (mer === 'am' && hour === 12) hour24 = 0;
  else if (!mer && hour <= 12) {
    // Bare "8" in food delivery usually means evening — prefer PM for 1–11.
    if (hour >= 1 && hour <= 11) hour24 = hour + 12;
  }
  if (hour24 > 23) return null;
  return { hour24, minute };
}

function isoAtLocal(now: Date, dayOffset: number, hour24: number, minute: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour24, minute, 0, 0);
  return d.toISOString();
}

function slotRangeLabel(day: 'Today' | 'Tomorrow', hour24: number, minute: number): string {
  const start = formatClockLabel(hour24, minute);
  const endMin = minute + 30;
  const endHour = hour24 + Math.floor(endMin / 60);
  const endMinute = endMin % 60;
  const end = formatClockLabel(endHour % 24, endMinute);
  return `${day}, ${start} - ${end}`;
}

/** 0 = today, 1 = tomorrow, 2+ = beyond kitchen horizon. */
export function resolveDeliveryDayOffset(text: string): number {
  if (DAY_AFTER_RE.test(text)) return 2;
  if (TOMORROW_RE.test(text)) return 1;
  return 0;
}

function isVagueMultiDay(text: string): boolean {
  return /\b(sometime|some\s+time)\b/i.test(text);
}

function parseClock(text: string): { hour24: number; minute: number; ampm?: string; raw: string } | null {
  const clock = text.match(CLOCK_RE);
  if (!clock) return null;
  const hour = Number.parseInt(clock[1] || clock[4] || clock[7] || '', 10);
  const minute = Number.parseInt(clock[2] || clock[5] || '0', 10);
  const ampm = clock[3] || clock[6] || clock[8];
  const resolved = toHour24(hour, minute, ampm);
  if (!resolved || !Number.isFinite(hour)) return null;
  return { ...resolved, ...(ampm ? { ampm } : {}), raw: clock[0] };
}

function outOfHorizonEntity(rawValue: string, ambiguous: boolean): DeliveryTimeEntity {
  return {
    type: 'DeliveryTime',
    rawValue,
    normalizedValue: 'out_of_horizon',
    mode: 'scheduled',
    // No deliveryTimeSlot — never invent Today/Tomorrow for day-after+.
    ...(ambiguous ? { ambiguous: true } : {}),
    confidence: ambiguous ? 0.5 : 0.7,
  };
}

export class RegexDeliveryTimeExtractor implements IEntityExtractor {
  public readonly name = 'RegexDeliveryTimeExtractor';

  public extract(normalizedTranscript: string, now: Date = new Date()): DeliveryTimeEntity[] {
    const text = normalizedTranscript.trim();
    if (!text) return [];

    if (ASAP_RE.test(text)) {
      return [
        {
          type: 'DeliveryTime',
          rawValue: text.match(ASAP_RE)?.[0] ?? 'asap',
          normalizedValue: 'asap',
          mode: 'asap',
          slotLabel: 'ASAP',
          deliveryTimeSlot: 'ASAP',
          confidence: 0.95,
        },
      ];
    }

    const dayOffset = resolveDeliveryDayOffset(text);
    const dayAfterRaw = text.match(DAY_AFTER_RE)?.[0];

    // Beyond kitchen horizon (Today/Tomorrow only) → clarify; no fake slot.
    if (dayOffset >= 2) {
      const vague = isVagueMultiDay(text);
      return [
        outOfHorizonEntity(
          dayAfterRaw ?? text.match(SCHEDULE_VERB_RE)?.[0] ?? 'day after',
          vague,
        ),
      ];
    }

    const clock = parseClock(text);
    const hasLunch = LUNCH_RE.test(text);
    const hasDinner = DINNER_RE.test(text) || (BARE_DINNER_RE.test(text) && dayOffset === 0);

    // Tomorrow lunch / dinner
    if (dayOffset === 1 && hasLunch) {
      return [
        {
          type: 'DeliveryTime',
          rawValue: text.match(/\btomorrow\b.*?\b(lunch|brunch)\b/i)?.[0] ?? 'tomorrow lunch',
          normalizedValue: 'tomorrow_lunch',
          mode: 'scheduled',
          slotLabel: 'Tomorrow lunch',
          deliveryTimeSlot: 'Tomorrow, Lunch',
          scheduledForHint: isoAtLocal(now, 1, 13, 0),
          confidence: 0.9,
        },
      ];
    }
    if (dayOffset === 1 && hasDinner) {
      return [
        {
          type: 'DeliveryTime',
          rawValue: text.match(/\btomorrow\b.*?\b(dinner|supper|evening)\b/i)?.[0] ?? 'tomorrow dinner',
          normalizedValue: 'tomorrow_dinner',
          mode: 'scheduled',
          slotLabel: 'Tomorrow dinner',
          deliveryTimeSlot: 'Tomorrow, Dinner',
          scheduledForHint: isoAtLocal(now, 1, 20, 0),
          confidence: 0.9,
        },
      ];
    }

    // Tomorrow + clock (e.g. "tomorrow 8 pm")
    if (dayOffset === 1 && clock) {
      const label = formatClockLabel(clock.hour24, clock.minute);
      return [
        {
          type: 'DeliveryTime',
          rawValue: `tomorrow ${clock.raw}`.trim(),
          normalizedValue: `tomorrow_${pad2(clock.hour24)}${pad2(clock.minute)}`,
          mode: 'scheduled',
          slotLabel: `Tomorrow ${label}`,
          deliveryTimeSlot: slotRangeLabel('Tomorrow', clock.hour24, clock.minute),
          scheduledForHint: isoAtLocal(now, 1, clock.hour24, clock.minute),
          confidence: clock.ampm ? 0.92 : 0.85,
        },
      ];
    }

    // Vague tomorrow without a clock/meal → ambiguous
    if (dayOffset === 1 && isVagueMultiDay(text)) {
      return [
        {
          type: 'DeliveryTime',
          rawValue: text.match(SCHEDULE_VERB_RE)?.[0] ?? 'sometime tomorrow',
          normalizedValue: 'ambiguous',
          mode: 'scheduled',
          ambiguous: true,
          confidence: 0.5,
        },
      ];
    }

    // Today lunch / dinner (explicit or bare meal without tomorrow)
    const todayLunch =
      (TODAY_MEAL_PREFIX_RE.test(text) && hasLunch && dayOffset === 0) ||
      (BARE_LUNCH_RE.test(text) && dayOffset === 0 && !TOMORROW_RE.test(text) && !DAY_AFTER_RE.test(text));
    if (todayLunch && dayOffset === 0) {
      const raw = text.match(BARE_LUNCH_RE)?.[0] ?? text.match(LUNCH_RE)?.[0] ?? 'lunch';
      return [
        {
          type: 'DeliveryTime',
          rawValue: raw,
          normalizedValue: 'today_lunch',
          mode: 'scheduled',
          slotLabel: 'Today lunch',
          deliveryTimeSlot: 'Today, Lunch',
          scheduledForHint: isoAtLocal(now, 0, 13, 0),
          confidence: 0.85,
        },
      ];
    }

    const todayDinner =
      (TODAY_MEAL_PREFIX_RE.test(text) && (DINNER_RE.test(text) || BARE_DINNER_RE.test(text)) && dayOffset === 0) ||
      (BARE_DINNER_RE.test(text) && dayOffset === 0 && !TOMORROW_RE.test(text) && !DAY_AFTER_RE.test(text));
    if (todayDinner && dayOffset === 0) {
      const raw = text.match(BARE_DINNER_RE)?.[0] ?? text.match(DINNER_RE)?.[0] ?? 'dinner';
      return [
        {
          type: 'DeliveryTime',
          rawValue: raw,
          normalizedValue: 'today_dinner',
          mode: 'scheduled',
          slotLabel: 'Today dinner',
          deliveryTimeSlot: 'Today, Dinner',
          scheduledForHint: isoAtLocal(now, 0, 20, 0),
          confidence: 0.85,
        },
      ];
    }

    // Today clock (default when no tomorrow/day-after)
    if (clock && dayOffset === 0) {
      const label = formatClockLabel(clock.hour24, clock.minute);
      return [
        {
          type: 'DeliveryTime',
          rawValue: clock.raw,
          normalizedValue: `today_${pad2(clock.hour24)}${pad2(clock.minute)}`,
          mode: 'scheduled',
          slotLabel: label,
          deliveryTimeSlot: slotRangeLabel('Today', clock.hour24, clock.minute),
          scheduledForHint: isoAtLocal(now, 0, clock.hour24, clock.minute),
          confidence: clock.ampm ? 0.92 : 0.8,
        },
      ];
    }

    // Bare "tomorrow" without time → ambiguous / missing clear slot
    if (dayOffset === 1) {
      return [
        {
          type: 'DeliveryTime',
          rawValue: text.match(TOMORROW_RE)?.[0] ?? 'tomorrow',
          normalizedValue: 'ambiguous',
          mode: 'scheduled',
          ambiguous: true,
          confidence: 0.55,
        },
      ];
    }

    // "schedule" / "later" / vague bands without a resolvable time → ambiguous.
    if (SCHEDULE_VERB_RE.test(text) || VAGUE_BAND_RE.test(text)) {
      return [
        {
          type: 'DeliveryTime',
          rawValue:
            text.match(SCHEDULE_VERB_RE)?.[0] ??
            text.match(VAGUE_BAND_RE)?.[0] ??
            'schedule',
          normalizedValue: 'ambiguous',
          mode: 'scheduled',
          ambiguous: true,
          confidence: 0.55,
        },
      ];
    }

    return [];
  }
}
